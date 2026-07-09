import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const RESEND_API = "https://api.resend.com";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      from_address,
      from_name,
      to,
      cc,
      bcc,
      subject,
      html,
      text,
      message_id,
      in_reply_to,
      account_id,
      attachments = [],
    } = body;

    if (!from_address || !to || to.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: from_address, to" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({
          error: "RESEND_API_KEY not configured. Add your free Resend API key in Supabase Edge Function secrets.",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build Resend email payload
    const emailPayload: Record<string, any> = {
      from: from_name ? `${from_name} <${from_address}>` : from_address,
      to: Array.isArray(to) ? to : [to],
      subject: subject || "",
      html: html || undefined,
      text: text || undefined,
    };

    if (cc && (Array.isArray(cc) ? cc.length > 0 : cc)) {
      emailPayload.cc = Array.isArray(cc) ? cc : [cc];
    }
    if (bcc && (Array.isArray(bcc) ? bcc.length > 0 : bcc)) {
      emailPayload.bcc = Array.isArray(bcc) ? bcc : [bcc];
    }

    // Custom headers for threading
    const customHeaders: Record<string, string> = {};
    if (message_id) customHeaders["Message-Id"] = message_id;
    if (in_reply_to) customHeaders["In-Reply-To"] = in_reply_to;
    if (Object.keys(customHeaders).length > 0) {
      emailPayload.headers = customHeaders;
    }

    // Fetch and base64-encode attachments from Supabase Storage
    if (attachments.length > 0) {
      emailPayload.attachments = [];
      for (const att of attachments) {
        if (!att.storage_path) continue;
        const { data: fileData, error: fileError } = await supabase.storage
          .from("email-attachments")
          .download(att.storage_path);
        if (!fileError && fileData) {
          const buffer = await fileData.arrayBuffer();
          const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
          emailPayload.attachments.push({
            filename: att.filename,
            content: base64,
          });
        }
      }
    }

    // Send via Resend
    const resendResponse = await fetch(`${RESEND_API}/emails`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    const resendResult = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error("Resend error:", resendResult);
      return new Response(
        JSON.stringify({ error: resendResult.message || "Failed to send email via Resend" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse recipients for storage
    const parseRecipients = (list: string[]) =>
      list.map((r: string) => {
        const match = r.match(/^(.*?)\s*<(.+?)>\s*$/);
        return match
          ? { name: match[1].trim(), email: match[2].trim() }
          : { email: r.trim() };
      });

    // Save sent email to Supabase
    const { data: emailRow, error: insertError } = await supabase
      .from("emails")
      .insert({
        user_id: user.id,
        account_id,
        folder: "sent",
        from_address,
        from_name: from_name || "",
        to_addresses: parseRecipients(Array.isArray(to) ? to : [to]),
        cc_addresses: parseRecipients(Array.isArray(cc) ? cc : []),
        bcc_addresses: parseRecipients(Array.isArray(bcc) ? bcc : []),
        subject: subject || "",
        body_html: html || "",
        body_text: text || "",
        external_message_id: message_id || null,
        in_reply_to: in_reply_to || null,
        is_read: true,
        is_draft: false,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("DB insert error:", insertError);
    }

    // Save attachment metadata
    if (emailRow && attachments.length > 0) {
      for (const att of attachments) {
        if (!att.storage_path) continue;
        await supabase.from("email_attachments").insert({
          email_id: emailRow.id,
          filename: att.filename,
          mime_type: att.mime_type || "application/octet-stream",
          file_size: att.file_size || 0,
          storage_path: att.storage_path,
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, id: resendResult.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("send-email error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

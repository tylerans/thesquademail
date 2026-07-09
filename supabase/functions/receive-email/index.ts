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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    // Parse the Resend webhook payload (JSON)
    const event = await req.json();

    // Only process email.received events
    if (event.type !== "email.received") {
      return new Response(JSON.stringify({ ok: true, note: "ignored_event_type" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = event.data;
    const emailId = data?.email_id;
    const fromRaw = data?.from || "";
    const toList: string[] = data?.to || [];
    const ccList: string[] = data?.cc || [];
    const subject = data?.subject || "";
    const messageId = data?.message_id || null;
    const attachmentsMeta: any[] = data?.attachments || [];

    if (!emailId) {
      console.warn("No email_id in webhook payload");
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse from header
    const fromMatch = fromRaw.match(/^(.*?)\s*<(.+?)>\s*$/);
    const fromName = fromMatch ? fromMatch[1].replace(/['"]/g, "").trim() : "";
    const fromAddress = fromMatch ? fromMatch[2].trim() : fromRaw.trim();

    // Fetch full email content from Resend (body not included in webhook)
    let bodyHtml = "";
    let bodyText = "";
    let inReplyTo: string | null = null;

    if (resendApiKey) {
      const contentRes = await fetch(`${RESEND_API}/emails/received/${emailId}`, {
        headers: { Authorization: `Bearer ${resendApiKey}` },
      });
      if (contentRes.ok) {
        const contentData = await contentRes.json();
        bodyHtml = contentData.html || "";
        bodyText = contentData.text || "";
        // Extract In-Reply-To header
        const headers: { name: string; value: string }[] = contentData.headers || [];
        const replyToHeader = headers.find((h) => h.name.toLowerCase() === "in-reply-to");
        if (replyToHeader) inReplyTo = replyToHeader.value;
      }
    }

    // Find which email accounts the recipients match
    const parseAddressList = (list: string[]) =>
      list.map((s) => {
        const m = s.match(/^(.*?)\s*<(.+?)>\s*$/);
        return m ? { name: m[1].replace(/['"]/g, "").trim(), email: m[2].trim() } : { email: s.trim() };
      });

    const allRecipients = [...toList, ...ccList];
    const matchedAccounts: Array<{ id: string; user_id: string }> = [];

    for (const recipientStr of allRecipients) {
      const cleanEmail = recipientStr.toLowerCase().replace(/.*<(.+?)>.*/, "$1").trim();
      const { data: account } = await supabase
        .from("email_accounts")
        .select("id, user_id")
        .ilike("address", cleanEmail)
        .maybeSingle();
      if (account) matchedAccounts.push(account);
    }

    if (matchedAccounts.length === 0) {
      console.warn("No matching email accounts for recipients:", allRecipients);
      return new Response(JSON.stringify({ ok: true, note: "no_matching_account" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    for (const account of matchedAccounts) {
      const { data: emailRow, error: emailError } = await supabase
        .from("emails")
        .insert({
          user_id: account.user_id,
          account_id: account.id,
          folder: "inbox",
          from_address: fromAddress,
          from_name: fromName,
          to_addresses: parseAddressList(toList),
          cc_addresses: parseAddressList(ccList),
          bcc_addresses: [],
          subject,
          body_html: bodyHtml,
          body_text: bodyText,
          external_message_id: messageId,
          in_reply_to: inReplyTo,
          is_read: false,
          is_draft: false,
        })
        .select("id")
        .single();

      if (emailError) {
        console.error("Failed to insert email:", emailError);
        continue;
      }

      // Download and store attachments
      if (emailRow && resendApiKey && attachmentsMeta.length > 0) {
        for (const att of attachmentsMeta) {
          try {
            const attRes = await fetch(
              `${RESEND_API}/emails/received/${emailId}/attachments/${att.id}`,
              { headers: { Authorization: `Bearer ${resendApiKey}` } }
            );
            if (!attRes.ok) continue;

            const attBuffer = await attRes.arrayBuffer();
            const storagePath = `${account.user_id}/inbound/${emailRow.id}/${att.filename}`;

            const { error: uploadError } = await supabase.storage
              .from("email-attachments")
              .upload(storagePath, attBuffer, {
                contentType: att.content_type || "application/octet-stream",
                upsert: true,
              });

            if (!uploadError) {
              await supabase.from("email_attachments").insert({
                email_id: emailRow.id,
                filename: att.filename,
                mime_type: att.content_type || "application/octet-stream",
                file_size: attBuffer.byteLength,
                storage_path: storagePath,
              });
            }
          } catch (attErr) {
            console.warn("Attachment download failed:", attErr);
          }
        }
      }

      // Auto-save sender to contacts
      if (fromAddress) {
        await supabase
          .from("contacts")
          .upsert(
            { user_id: account.user_id, email: fromAddress, name: fromName || fromAddress },
            { onConflict: "user_id,email", ignoreDuplicates: true }
          );
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("receive-email error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

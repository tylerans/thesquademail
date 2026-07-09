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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({
          error: "RESEND_API_KEY not configured",
          setup_required: true,
          message: "Add your free Resend API key as RESEND_API_KEY in Supabase Edge Function secrets.",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { domain_name } = await req.json();
    if (!domain_name) {
      return new Response(JSON.stringify({ error: "domain_name is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/receive-email`;

    // Check if domain already exists in Resend by listing domains
    let resendDomainId: string | null = null;
    let domainRecords: any[] = [];

    const listRes = await fetch(`${RESEND_API}/domains`, {
      headers: { Authorization: `Bearer ${resendApiKey}` },
    });
    if (listRes.ok) {
      const listData = await listRes.json();
      const existing = (listData.data || []).find((d: any) => d.name === domain_name);
      if (existing) resendDomainId = existing.id;
    }

    if (!resendDomainId) {
      // Create domain for sending
      const createRes = await fetch(`${RESEND_API}/domains`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: domain_name }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) {
        return new Response(
          JSON.stringify({ error: createData.message || "Failed to create domain in Resend" }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      resendDomainId = createData.id;
      domainRecords = createData.records || [];
    }

    // Enable receiving capability on the domain
    await fetch(`${RESEND_API}/domains/${resendDomainId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        capabilities: { receiving: "enabled" },
      }),
    });

    // Fetch domain details to get all records including inbound MX
    const domainRes = await fetch(`${RESEND_API}/domains/${resendDomainId}`, {
      headers: { Authorization: `Bearer ${resendApiKey}` },
    });
    if (domainRes.ok) {
      const domainData = await domainRes.json();
      domainRecords = domainData.records || [];
    }

    // Ensure a webhook exists for email.received events
    try {
      const webhooksRes = await fetch(`${RESEND_API}/webhooks`, {
        headers: { Authorization: `Bearer ${resendApiKey}` },
      });
      let webhookExists = false;
      if (webhooksRes.ok) {
        const wbData = await webhooksRes.json();
        webhookExists = (wbData.data || []).some(
          (w: any) =>
            w.endpoint === webhookUrl &&
            (w.events || []).includes("email.received")
        );
      }
      if (!webhookExists) {
        await fetch(`${RESEND_API}/webhooks`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            endpoint: webhookUrl,
            events: ["email.received"],
          }),
        });
      }
    } catch (whErr) {
      console.warn("Webhook setup warning:", whErr);
    }

    // Format records for the UI
    const formattedRecords = domainRecords.map((r: any) => ({
      record: r.record,
      type: r.type,
      host: r.name,
      value: r.value,
      priority: r.priority,
      valid: r.status === "verified",
    }));

    // Upsert domain in Supabase
    const { data: domainRow, error: upsertError } = await supabase
      .from("domains")
      .upsert(
        {
          user_id: user.id,
          domain_name,
          status: "pending",
          mailgun_domain: resendDomainId, // reusing column to store Resend domain ID
        },
        { onConflict: "user_id,domain_name" }
      )
      .select("id")
      .single();

    if (upsertError) {
      console.error("DB upsert error:", upsertError);
    }

    return new Response(
      JSON.stringify({
        domain_id: domainRow?.id,
        resend_domain_id: resendDomainId,
        domain_name,
        records: formattedRecords,
        webhook_url: webhookUrl,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("get-dns-records error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

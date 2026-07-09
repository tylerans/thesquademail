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
        JSON.stringify({ error: "RESEND_API_KEY not configured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { domain_id, resend_domain_id, domain_name } = await req.json();

    // Use the stored Resend domain ID or fall back to looking up by name
    let rdId = resend_domain_id;
    if (!rdId) {
      const { data: domainRow } = await supabase
        .from("domains")
        .select("mailgun_domain")
        .eq("id", domain_id)
        .single();
      rdId = domainRow?.mailgun_domain;
    }

    if (!rdId) {
      return new Response(
        JSON.stringify({ error: "No Resend domain ID found. Re-add the domain to provision it." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call Resend domain verify endpoint
    const verifyRes = await fetch(`${RESEND_API}/domains/${rdId}/verify`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!verifyRes.ok) {
      const errData = await verifyRes.json();
      return new Response(
        JSON.stringify({ error: errData.message || "Failed to verify domain" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get updated domain details with record statuses
    const domainRes = await fetch(`${RESEND_API}/domains/${rdId}`, {
      headers: { Authorization: `Bearer ${resendApiKey}` },
    });
    const domainData = await domainRes.json();
    const allRecords = domainData.records || [];

    // Determine if fully verified (all sending records valid; receiving MX may still be pending)
    const sendingRecords = allRecords.filter((r: any) =>
      r.record === "SPF" || r.record === "DKIM"
    );
    const allSendingValid = sendingRecords.length > 0 && sendingRecords.every(
      (r: any) => r.status === "verified"
    );
    const newStatus = allSendingValid ? "verified" : "pending";

    await supabase
      .from("domains")
      .update({ status: newStatus })
      .eq("id", domain_id)
      .eq("user_id", user.id);

    const formattedRecords = allRecords.map((r: any) => ({
      type: r.type,
      record: r.record,
      host: r.name,
      value: r.value,
      priority: r.priority,
      valid: r.status === "verified",
    }));

    return new Response(
      JSON.stringify({ status: newStatus, records: formattedRecords }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("verify-domain error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

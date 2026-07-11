import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  document.body.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:sans-serif;background:#f8fafc;">
      <div style="max-width:480px;padding:32px;background:#fff;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.08);text-align:center;">
        <div style="width:48px;height:48px;background:#fee2e2;border-radius:12px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
          <svg width="24" height="24" fill="none" stroke="#ef4444" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <h2 style="margin:0 0 8px;color:#0f172a;font-size:18px;font-weight:600;">Missing environment variables</h2>
        <p style="margin:0 0 20px;color:#64748b;font-size:14px;line-height:1.6;">
          <strong>VITE_SUPABASE_URL</strong> and <strong>VITE_SUPABASE_ANON_KEY</strong> must be set in your Vercel project settings under <em>Settings → Environment Variables</em>, then redeployed.
        </p>
        <p style="margin:0;color:#94a3b8;font-size:12px;">These values are in your local <code>.env</code> file.</p>
      </div>
    </div>
  `;
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

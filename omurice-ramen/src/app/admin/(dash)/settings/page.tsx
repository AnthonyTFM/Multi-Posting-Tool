import { SettingsPanel } from "@/components/admin/SettingsPanel";
import { aiConfigured, MODEL } from "@/lib/ai/client";
import { posProvider } from "@/lib/pos";
import { smsEnabled } from "@/lib/twilio";
import { staffNumber } from "@/lib/voice/twiml";

export default function SettingsPage() {
  const base = process.env.PUBLIC_BASE_URL || "https://YOUR-DOMAIN";
  const status = [
    { label: "AI (chat + phone)", ok: aiConfigured(), detail: aiConfigured() ? `Model ${MODEL}` : "Set ANTHROPIC_API_KEY" },
    { label: "Twilio phone webhooks", ok: !!process.env.TWILIO_AUTH_TOKEN, detail: `Voice webhook: ${base}/api/voice/incoming` },
    { label: "Transfer line (human)", ok: !!staffNumber(), detail: staffNumber() ?? "Set STAFF_TRANSFER_NUMBER (2nd store line)" },
    { label: "Text messages", ok: smsEnabled(), detail: smsEnabled() ? "Confirmations + ready alerts on" : "Set TWILIO_SMS_FROM to text customers" },
    {
      label: "Honor POS sync",
      ok: posProvider() !== "none",
      detail: posProvider() === "none" ? "Dashboard only. Connect via Deliverect when ready" : `Via ${posProvider()}`,
    },
  ];
  return (
    <div>
      <h1 className="text-3xl font-extrabold">Settings &amp; FAQ</h1>
      <section className="mt-6 rounded-2xl border border-line bg-card p-5 shadow-soft">
        <h2 className="text-lg font-bold">System status</h2>
        <ul className="mt-3 divide-y divide-line">
          {status.map((s) => (
            <li key={s.label} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
              <span className={`h-2.5 w-2.5 rounded-full ${s.ok ? "bg-matcha" : "bg-yolk"}`} aria-hidden />
              <span className="w-48 font-semibold">{s.label}</span>
              <span className="min-w-0 flex-1 break-all text-ink-3">{s.detail}</span>
            </li>
          ))}
        </ul>
      </section>
      <SettingsPanel />
    </div>
  );
}

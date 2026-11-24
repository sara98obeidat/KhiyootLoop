import { FounderLoginForm } from "./FounderLoginForm";
import { LogoutButton } from "./FounderActions";
import type { FounderSession } from "@/lib/founder";

/** Shown instead of founder content when the visitor is not the founder. */
export function FounderGate({ session }: { session: Exclude<FounderSession, { ok: true }> }) {
  if (session.reason === "not_configured") {
    return (
      <div className="card">
        <h1>Founder area not set up</h1>
        <p>Founder sign-in needs Supabase. Follow the setup guide (docs/SETUP.md) to connect it.</p>
      </div>
    );
  }
  if (session.reason === "not_founder") {
    return (
      <div className="card">
        <h1>Not authorised</h1>
        <p>You are signed in, but this account is not the authorised founder account.</p>
        <LogoutButton />
      </div>
    );
  }
  return <FounderLoginForm />;
}

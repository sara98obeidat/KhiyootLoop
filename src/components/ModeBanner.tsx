import { currentOrderMode, TEST_NOTICE } from "@/config/site";
import { devMemoryBackendEnabled, supabaseConfigured, devFakeEmailMode } from "@/lib/env";

export function ModeBanner() {
  const test = currentOrderMode() === "test";
  const devMemory = !supabaseConfigured() && devMemoryBackendEnabled();
  const fakeEmail = devFakeEmailMode();
  return (
    <>
      {test && (
        <div className="test-banner" role="note">
          {TEST_NOTICE}
        </div>
      )}
      {devMemory && (
        <div className="dev-banner" role="note">
          Development mode: orders are kept in temporary memory, not in the database.
          {fakeEmail ? ` Emails are simulated (${fakeEmail}).` : ""}
        </div>
      )}
    </>
  );
}

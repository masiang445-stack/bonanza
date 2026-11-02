import { useState } from "react";
import { authClient } from "@/lib/auth/client";
import { useCurrentUser } from "@/lib/auth/use-current-user";

const BEARER_KEY = "grok-auth.bearer-token";

function clearLocalSession() {
  try {
    window.sessionStorage.removeItem(BEARER_KEY);
  } catch {
    /* ignore */
  }
}

export function AccountMenu() {
  const user = useCurrentUser();
  const [busy, setBusy] = useState(false);
  if (!user) return null;
  const label = user.displayName ?? user.primaryEmail ?? "Akun";

  async function logout() {
    if (busy) return;
    setBusy(true);
    try {
      await Promise.race([
        authClient.signOut().then(({ error }) => {
          if (error) throw new Error(error.message ?? "Gagal keluar");
        }),
        new Promise<never>((_, reject) => {
          window.setTimeout(() => reject(new Error("timeout")), 8000);
        }),
      ]);
    } catch {
      /* still leave the page so the visitor is not stuck signed in */
    } finally {
      clearLocalSession();
      window.location.replace("/login");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="grid size-8 place-items-center rounded-full bg-primary/12 text-sm font-medium text-primary">
        {label.charAt(0).toUpperCase()}
      </span>
      <span className="hidden max-w-[9rem] truncate text-sm font-medium sm:inline">{label}</span>
      <button
        type="button"
        disabled={busy}
        onClick={() => void logout()}
        className="inline-flex h-9 items-center rounded-md px-2 text-sm font-medium text-muted hover:text-fg disabled:opacity-60"
      >
        {busy ? "Keluar…" : "Keluar"}
      </button>
    </div>
  );
}

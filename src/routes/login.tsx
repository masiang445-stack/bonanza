import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { authClient, authEnabled } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { ensureDefaultAdmin, getMyProfile } from "@/lib/server/shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isValidUsername, usernameToEmail } from "@/lib/username";

type LoginSearch = { redirect?: string };

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): LoginSearch => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
  }),
  component: Login,
});

function homeForRole(role: string, dest: string) {
  if (role === "admin" || role === "staff") return "/admin";
  return dest;
}

function Login() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const { user, isPending } = useCurrentUserState();
  const dest = redirect && redirect.startsWith("/") ? redirect : "/";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
    void ensureDefaultAdmin().catch(() => undefined);
  }, []);

  function validateForm() {
    let ok = true;
    const user = username.trim();
    if (!user) {
      setUsernameError("Username wajib diisi.");
      ok = false;
    } else if (!isValidUsername(user)) {
      setUsernameError("Username 3\u201332 karakter: huruf, angka, titik, strip, atau underscore.");
      ok = false;
    } else {
      setUsernameError("");
    }
    if (!password) {
      setPasswordError("Kata sandi wajib diisi.");
      ok = false;
    } else if (password.length < 8) {
      setPasswordError("Kata sandi minimal 8 karakter.");
      ok = false;
    } else if (/\s/.test(password)) {
      setPasswordError("Kata sandi tidak boleh berisi spasi.");
      ok = false;
    } else if (password.length > 72) {
      setPasswordError("Kata sandi maksimal 72 karakter.");
      ok = false;
    } else {
      setPasswordError("");
    }
    return ok;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!validateForm()) return;
    setPending(true);
    try {
      const { error: err } = await authClient.signIn.email({
        email: usernameToEmail(username),
        password,
      });
      if (err) throw new Error("Username atau kata sandi salah.");
      await authClient.getSession();
      const profile = await getMyProfile();
      await navigate({ to: homeForRole(profile.role, dest) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setPending(false);
    }
  }

  if (!ready || isPending) {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <div className="h-8 w-40 rounded-md bg-primary/10" />
      </main>
    );
  }
  if (user) return <SignedInRedirect dest={dest} />;

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 rounded-2xl bg-surface p-6 shadow-[var(--shadow-border)] sm:p-8"
        noValidate
      >
        <img src="/logo.png" alt="Bonanza" className="logo logo-login" />
        {!authEnabled ? (
          <p className="text-center text-sm text-muted">Masuk sedang dinonaktifkan.</p>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                autoComplete="username"
                required
                value={username}
                aria-invalid={Boolean(usernameError)}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setUsernameError("");
                  setError("");
                }}
              />
              {usernameError ? <p className="text-xs text-accent">{usernameError}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Kata sandi</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                aria-invalid={Boolean(passwordError)}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError("");
                  setError("");
                }}
              />
              {passwordError ? <p className="text-xs text-accent">{passwordError}</p> : null}
            </div>
            {error ? <p className="text-sm text-accent">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Memproses\u2026" : "Masuk"}
            </Button>
          </>
        )}
      </form>
    </main>
  );
}

function SignedInRedirect({ dest }: { dest: string }) {
  const navigate = useNavigate();
  useEffect(() => {
    void getMyProfile()
      .then((profile) => navigate({ to: homeForRole(profile.role, dest) }))
      .catch(() => navigate({ to: dest }));
  }, [dest, navigate]);
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="h-8 w-40 rounded-md bg-primary/10" />
    </main>
  );
}

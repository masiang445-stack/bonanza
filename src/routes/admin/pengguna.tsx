import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { PasswordRules } from "@/components/password-rules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatRupiah } from "@/lib/format";
import { isStrongPassword, validatePassword } from "@/lib/password";
import { adminCreateUser, adminListUsers } from "@/lib/server/shop";
import type { ShopUser, UserRole } from "@/lib/types";
import { isValidUsername, normalizeUsername, roleLabel } from "@/lib/username";

export const Route = createFileRoute("/admin/pengguna")({ component: AdminUsers });

function AdminUsers() {
  const [users, setUsers] = useState<ShopUser[] | null>(null);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>("customer");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function reload() {
    setUsers(await adminListUsers());
  }

  useEffect(() => {
    void reload().catch(() => setUsers([]));
  }, []);

  const usernameOk = isValidUsername(username);
  const passwordOk = isStrongPassword(password);
  const confirmOk = confirm.length > 0 && confirm === password;
  const canSubmit = name.trim().length >= 2 && usernameOk && passwordOk && confirmOk;

  const usernameHint = useMemo(() => {
    if (!username) return "";
    if (!usernameOk) return "Username 3–32 karakter: huruf, angka, titik, strip, atau underscore.";
    return "";
  }, [username, usernameOk]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!isValidUsername(username)) {
      setError("Username 3–32 karakter, huruf/angka/titik/strip.");
      return;
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (password !== confirm) {
      setError("Konfirmasi kata sandi tidak sama.");
      return;
    }
    setSaving(true);
    try {
      await adminCreateUser({
        data: { name, username: normalizeUsername(username), password, role },
      });
      setName("");
      setUsername("");
      setPassword("");
      setConfirm("");
      setRole("customer");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat pengguna.");
    } finally {
      setSaving(false);
    }
  }

  const unpaidUsers = (users ?? []).filter((u) => u.unpaidCount > 0);

  return (
    <div className="grid gap-8 lg:grid-cols-[20rem_1fr]">
      <form
        onSubmit={onSubmit}
        className="h-fit space-y-3 rounded-2xl bg-surface p-5 shadow-[var(--shadow-border)]"
        noValidate
      >
        <h2 className="text-xl font-semibold">Buat pengguna</h2>
        <div className="space-y-1.5">
          <Label htmlFor="uname">Nama</Label>
          <Input id="uname" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="uuser">Username</Label>
          <Input
            id="uuser"
            autoComplete="off"
            minLength={3}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            aria-invalid={username.length > 0 && !usernameOk}
          />
          {usernameHint ? <p className="text-xs text-accent">{usernameHint}</p> : null}
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="upass">Kata sandi</Label>
            <button
              type="button"
              className="text-xs font-medium text-muted hover:text-fg"
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? "Sembunyikan" : "Tampilkan"}
            </button>
          </div>
          <Input
            id="upass"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            aria-invalid={password.length > 0 && !passwordOk}
          />
          <PasswordRules password={password} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="uconfirm">Konfirmasi kata sandi</Label>
          <Input
            id="uconfirm"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            aria-invalid={confirm.length > 0 && !confirmOk}
          />
          {confirm.length > 0 && !confirmOk ? (
            <p className="text-xs text-accent">Konfirmasi tidak sama.</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="urole">Peran</Label>
          <select
            id="urole"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="flex h-11 w-full rounded-md border border-border bg-bg px-3 text-sm"
          >
            <option value="guest">Guest</option>
            <option value="dapur">Dapur</option>
            <option value="customer">Pelanggan</option>
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        {error ? <p className="text-sm text-accent">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={saving || !canSubmit}>
          {saving ? "Menyimpan…" : "Buat akun"}
        </Button>
      </form>

      <div className="space-y-4">
        {unpaidUsers.length > 0 ? (
          <div className="rounded-2xl bg-accent/8 p-4 text-sm">
            <p className="font-medium text-accent">Belum lunas</p>
            <ul className="mt-2 space-y-1">
              {unpaidUsers.map((u) => (
                <li key={u.id}>
                  {u.name || u.username} — {u.unpaidCount} invoice · {formatRupiah(u.unpaidTotal)}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {!users ? (
          <div className="h-48 rounded-2xl bg-primary/8" />
        ) : users.length === 0 ? (
          <div className="rounded-2xl bg-surface p-8 text-center shadow-[var(--shadow-border)]">
            <p className="font-medium">Belum ada pengguna</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl bg-surface shadow-[var(--shadow-border)]">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted">
                  <th className="px-4 py-3 font-medium">Pengguna</th>
                  <th className="px-4 py-3 font-medium">Peran</th>
                  <th className="px-4 py-3 font-medium">Lunas</th>
                  <th className="px-4 py-3 font-medium">Belum bayar</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-border/70">
                    <td className="px-4 py-3">
                      <p className="font-medium">{u.name || "—"}</p>
                      <p className="text-xs text-muted">{u.username}</p>
                    </td>
                    <td className="px-4 py-3">{roleLabel(u.role)}</td>
                    <td className="px-4 py-3 tabular-nums text-primary">{u.paidCount}</td>
                    <td className="px-4 py-3">
                      {u.unpaidCount > 0 ? (
                        <span className="tabular-nums text-accent">
                          {u.unpaidCount} · {formatRupiah(u.unpaidTotal)}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

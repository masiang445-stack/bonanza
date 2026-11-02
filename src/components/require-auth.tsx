import { Navigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getMyProfile } from "@/lib/server/shop";
import type { UserRole } from "@/lib/types";
import { canShop } from "@/lib/types";

function GateSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <div className="h-8 w-48 rounded-md bg-primary/10" />
      <div className="mt-6 h-40 rounded-2xl bg-primary/8" />
    </div>
  );
}

export function RequireAuth({
  children,
  redirect = "/",
}: {
  children: ReactNode;
  redirect?: string;
}) {
  const { user, isPending } = useCurrentUserState();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready || isPending) return <GateSkeleton />;
  if (!user) return <Navigate to="/login" search={{ redirect }} />;
  return <>{children}</>;
}

export function RequireCustomer({
  children,
  redirect = "/",
}: {
  children: ReactNode;
  redirect?: string;
}) {
  const { user, isPending } = useCurrentUserState();
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<UserRole | null | undefined>(undefined);

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    if (!user) {
      setRole(null);
      return;
    }
    void getMyProfile()
      .then((profile) => setRole(profile.role))
      .catch(() => setRole(null));
  }, [user]);

  if (!ready || isPending || (user && role === undefined)) return <GateSkeleton />;
  if (!user) return <Navigate to="/login" search={{ redirect }} />;
  if (role === "admin" || role === "staff") return <Navigate to="/admin" />;
  return <>{children}</>;
}

export function RequireShopper({
  children,
  redirect = "/",
}: {
  children: ReactNode;
  redirect?: string;
}) {
  const { user, isPending } = useCurrentUserState();
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<UserRole | null | undefined>(undefined);

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    if (!user) {
      setRole(null);
      return;
    }
    void getMyProfile()
      .then((profile) => setRole(profile.role))
      .catch(() => setRole(null));
  }, [user]);

  if (!ready || isPending || (user && role === undefined)) return <GateSkeleton />;
  if (!user) return <Navigate to="/login" search={{ redirect }} />;
  if (role === "admin" || role === "staff") return <Navigate to="/admin" />;
  if (!canShop(role)) return <Navigate to="/katalog" />;
  return <>{children}</>;
}

export function useMyRole() {
  const { user } = useCurrentUserState();
  const [role, setRole] = useState<UserRole | null | undefined>(undefined);

  useEffect(() => {
    if (!user) {
      setRole(null);
      return;
    }
    let active = true;
    void getMyProfile()
      .then((profile) => {
        if (active) setRole(profile.role);
      })
      .catch(() => {
        if (active) setRole(null);
      });
    return () => {
      active = false;
    };
  }, [user]);

  return role;
}

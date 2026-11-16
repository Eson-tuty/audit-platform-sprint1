import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { Me } from "../lib/types";
import { LoadingBlock } from "../components/ui";

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.get<{ data: Me }>("/auth/me")).data.data,
    retry: false,
    staleTime: 60_000,
  });
}

export function useCan() {
  const { data } = useMe();
  /** Accepts "a|b" to mean any of several permissions (mirrors the API middleware). */
  return (perm: string) => perm.split("|").some((p) => !!data?.permissions.includes(p));
}

export function useLogout() {
  const qc = useQueryClient();
  return async () => {
    try { await api.post("/auth/logout"); } finally {
      qc.clear();
      window.location.href = "/admin/login";
    }
  };
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { data, isLoading } = useMe();
  const location = useLocation();
  if (isLoading) return <div className="min-h-screen bg-paper"><LoadingBlock /></div>;
  if (!data) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

export function RequirePermission({ perm, children }: { perm: string; children: ReactNode }) {
  const can = useCan();
  if (!can(perm)) {
    return (
      <div className="rounded-xl border border-line bg-white px-6 py-16 text-center">
        <p className="font-medium">You don't have access to this section.</p>
        <p className="mt-1 text-sm text-muted">Ask an admin to grant the <code className="font-mono text-xs">{perm}</code> permission to your role.</p>
      </div>
    );
  }
  return <>{children}</>;
}

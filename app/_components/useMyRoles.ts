"use client";

import { useEffect, useState } from "react";

export type MyRoles = {
  role: string;
  branch: number | null;
  branchLeader: boolean;
};

/** Миний эрхийг серверээс авна (дахин нэвтрэхгүйгээр шинэчлэгдэнэ) */
export function useMyRoles() {
  const [roles, setRoles] = useState<MyRoles | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d) setRoles(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
  const isAdmin = roles?.role === "ADMIN";
  const isLeader = roles?.role === "LEADER";
  return { roles, isAdmin, isLeader, canManage: isAdmin || isLeader };
}

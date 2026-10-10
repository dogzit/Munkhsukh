import { verifyAuthToken, getAuthTokenFromCookies } from "@/lib/auth";

export type AuthUser = {
  userId: string;
  name: string;
  role: string;
};

/**
 * Verify JWT from cookies and return the authenticated user.
 * Returns null if not authenticated.
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const token = await getAuthTokenFromCookies();
    if (!token) return null;

    const payload = await verifyAuthToken(token);
    if (!payload.userId || !payload.name) return null;

    return {
      userId: payload.userId,
      name: payload.name,
      role: payload.role ?? "USER",
    };
  } catch {
    return null;
  }
}

/**
 * Check if authenticated user is admin.
 * role шинээр нэвтэрсэн token-уудаас гадна хуучин "admin" нэртэй
 * хэрэглэгчийг нэрээр нь дэмжинэ.
 */
export function isAdmin(user: AuthUser): boolean {
  return user.role === "ADMIN" || user.name.toLowerCase() === "admin";
}

// Админ эсэхийг API route-уудад lib/roles.ts-ийн isAdmin(req)-ээр шалгана:
// JWT дээрх role нь эрх хасагдсаны дараа ч 30 хоног хүртэл хуучин хэвээр үлддэг.

import prisma from "@/lib/prisma";

export type MyRoles = {
  role: string; // USER | LEADER | ADMIN
  branch: number | null;
  branchLeader: boolean;
};

/**
 * Хэрэглэгчийн эрхийг өгөгдлийн сангаас уншина.
 * JWT дээрх role нь дахин нэвтрэх хүртэл хуучин хэвээр байдаг тул
 * ангийн дарга / салааны даргын эрхийг үргэлж эндээс шалгана.
 */
export async function getMyRoles(req: Request): Promise<MyRoles | null> {
  const userName = req.headers.get("x-user-name");
  if (!userName) return null;
  const user = await prisma.user.findUnique({
    where: { name: userName },
    select: { role: true, branch: true, branchLeader: true },
  });
  if (!user) return null;
  const isAdminName = userName.toLowerCase() === "admin";
  return { ...user, role: isAdminName ? "ADMIN" : user.role };
}

/** Админ эсэх — өгөгдлийн сангаас (эрх хасагдвал шууд хүчинтэй) */
export async function isAdmin(req: Request) {
  return (await getMyRoles(req))?.role === "ADMIN";
}

/** Админ эсвэл ангийн дарга — даалгавар удирдах, нийтлэл/мессеж устгах */
export async function canManageClass(req: Request) {
  const r = await getMyRoles(req);
  return r?.role === "ADMIN" || r?.role === "LEADER";
}

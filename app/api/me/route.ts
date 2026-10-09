import { getMyRoles } from "@/lib/roles";
import { NextRequest, NextResponse } from "next/server";

/** GET /api/me — миний эрх (role, салаа, салааны дарга эсэх) */
export async function GET(req: NextRequest) {
  try {
    const roles = await getMyRoles(req);
    if (!roles) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json(roles);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

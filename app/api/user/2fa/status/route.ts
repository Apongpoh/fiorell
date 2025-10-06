import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { is2FAEnabledForUser } from "@/lib/2fa";

export async function GET(req: NextRequest) {
  let payload;
  try {
    payload = verifyAuth(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const enabled = await is2FAEnabledForUser(payload.userId);
  return NextResponse.json({ enabled });
}

import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { disable2FAForUser } from "@/lib/2fa";

export async function POST(req: NextRequest) {
  let payload;
  try {
    payload = verifyAuth(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await disable2FAForUser(payload.userId);
  return NextResponse.json({ success: true });
}

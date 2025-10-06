import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { get2FASecret, verify2FACode, enable2FAForUser } from "@/lib/2fa";

export async function POST(req: NextRequest) {
  let payload;
  try {
    payload = verifyAuth(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { code } = await req.json();
  const secret = await get2FASecret(payload.userId);
  if (!secret)
    return NextResponse.json({ error: "No 2FA setup" }, { status: 400 });
  const valid = verify2FACode(secret, code);
  if (!valid)
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  await enable2FAForUser(payload.userId);
  return NextResponse.json({ success: true });
}

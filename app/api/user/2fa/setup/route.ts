import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { generate2FASecret, save2FASecret } from "@/lib/2fa";

export async function POST(req: NextRequest) {
  let payload;
  try {
    payload = verifyAuth(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Generate secret and QR code
  const { secret, qrCodeUrl } = await generate2FASecret(payload.email);
  await save2FASecret(payload.userId, secret);
  return NextResponse.json({ qrCodeUrl, secret });
}

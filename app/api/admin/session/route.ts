import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";

export const runtime = "nodejs";

function sign(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("hex");
}

function isValidToken(token: string, secret: string) {
  const parts = token.split("|");
  if (parts.length !== 2) return false;

  const [email, signature] = parts;
  const expected = sign(email, secret);

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);

  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}

export async function GET(request: NextRequest) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  const expectedEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

  if (!secret || !expectedEmail) {
    return NextResponse.json({ authenticated: false }, { status: 200 });
  }

  const token = request.cookies.get("frameready_admin_session")?.value;

  if (!token || !isValidToken(token, secret)) {
    return NextResponse.json({ authenticated: false }, { status: 200 });
  }

  const [email] = token.split("|");
  const authenticated = email === expectedEmail;

  return NextResponse.json({ authenticated }, { status: 200 });
}
import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";

export const runtime = "nodejs";

function sign(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    const expectedEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const expectedPassword = process.env.ADMIN_PASSWORD?.trim();
    const secret = process.env.ADMIN_SESSION_SECRET;

    if (!expectedEmail || !expectedPassword || !secret) {
      return NextResponse.json(
        { error: "Admin auth is not configured." },
        { status: 500 }
      );
    }

    const incomingEmail = String(email ?? "").trim().toLowerCase();
    const incomingPassword = String(password ?? "").trim();

    const emailOk = incomingEmail === expectedEmail;
    const passwordOk = incomingPassword === expectedPassword;

    if (!emailOk || !passwordOk) {
      return NextResponse.json(
        { error: "Invalid admin email or password." },
        { status: 401 }
      );
    }

    const payload = expectedEmail;
    const signature = sign(payload, secret);
    const token = `${payload}|${signature}`;

    const response = NextResponse.json({ success: true });

    response.cookies.set({
      name: "frameready_admin_session",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8,
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "Unable to process login." },
      { status: 500 }
    );
  }
}
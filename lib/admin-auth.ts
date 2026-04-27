import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

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

export async function requireAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("frameready_admin_session")?.value;

  const secret = process.env.ADMIN_SESSION_SECRET;
  const expectedEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

  if (!token || !secret || !expectedEmail || !isValidToken(token, secret)) {
    return { authenticated: false as const };
  }

  const [email] = token.split("|");

  if (email !== expectedEmail) {
    return { authenticated: false as const };
  }

  return {
    authenticated: true as const,
    email,
  };
}
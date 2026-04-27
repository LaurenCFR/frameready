import { randomBytes } from "crypto";

export function generateDeliveryToken(length = 24): string {
  return randomBytes(length).toString("hex");
}
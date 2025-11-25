import crypto from "node:crypto";
import { env } from "../env";

export function hashValue(value: string): string {
  return crypto.createHmac("sha256", env.HASH_SALT).update(value).digest("hex");
}



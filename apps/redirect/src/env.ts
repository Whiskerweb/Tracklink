import { z } from "zod";

const envSchema = z.object({
  REDIRECT_PORT: z.coerce.number().default(4100),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  CLICK_COOKIE_SECRET: z.string().min(32, "CLICK_COOKIE_SECRET must be strong"),
  HASH_SALT: z.string().min(16, "HASH_SALT must be at least 16 chars"),
});

export const env = envSchema.parse(process.env);



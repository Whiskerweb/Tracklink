import { z } from "zod";

const envSchema = z.object({
  API_PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  HASH_SALT: z.string().min(16, "HASH_SALT must be at least 16 characters"),
  // Supabase (optional for Phase 1, required for Phase 2)
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  // Default domain for all links
  DEFAULT_DOMAIN: z.string().default("traaaction.com"),
});

export const env = envSchema.parse(process.env);

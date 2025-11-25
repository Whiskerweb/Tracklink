import { z } from "zod";
import dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

const envSchema = z.object({
  SHOPIFY_API_KEY: z.string().optional(),
  SHOPIFY_API_SECRET: z.string().optional(),
  SHOPIFY_SCOPES: z.string().default("read_orders,read_customers").optional(),
  SHOPIFY_APP_URL: z.string().optional(),
  SHOPIFY_WORKSPACE_ID: z.string().optional(),
  API_URL: z.string().url().default("http://localhost:4000"),
  DATABASE_URL: z.string().url(),
  SHOPIFY_PORT: z.coerce.number().default(3001),
});

export const env = envSchema.parse({
  SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY || "",
  SHOPIFY_API_SECRET: process.env.SHOPIFY_API_SECRET || "",
  SHOPIFY_SCOPES: process.env.SHOPIFY_SCOPES || "read_orders,read_customers",
  SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL || "",
  SHOPIFY_WORKSPACE_ID: process.env.SHOPIFY_WORKSPACE_ID || "",
  API_URL: process.env.API_URL || "http://localhost:4000",
  DATABASE_URL: process.env.DATABASE_URL,
  SHOPIFY_PORT: process.env.SHOPIFY_PORT || 3001,
});


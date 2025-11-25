import { z } from "zod";

export const linkBaseSchema = z.object({
  workspaceId: z.string().cuid(),
  domainId: z.string().cuid().optional(), // Optional - will use default domain if not provided
  slug: z.string().min(1).max(128).optional(), // Optional - will be auto-generated if not provided
  targetUrl: z.string().url(),
  trackConversion: z.boolean().optional(),
  title: z.string().max(256).optional(),
  description: z.string().max(512).optional(),
  tags: z.array(z.string().max(64)).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  partnerId: z.string().cuid().optional().nullable(),
  partnerLinkId: z.string().cuid().optional().nullable(),
});

export const createLinkSchema = linkBaseSchema;

export const getLinksQuerySchema = z.object({
  workspaceId: z.string().cuid(),
  domainId: z.string().cuid().optional(),
  tag: z.string().optional(),
  search: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export type CreateLinkInput = z.infer<typeof createLinkSchema>;
export type GetLinksQuery = z.infer<typeof getLinksQuerySchema>;


import { z } from "zod";

export const createDomainSchema = z.object({
  workspaceId: z.string().cuid(),
  host: z.string().min(1).max(255),
  verified: z.boolean().optional(),
});

export const updateDomainSchema = z.object({
  verified: z.boolean().optional(),
});

export const getDomainsQuerySchema = z.object({
  workspaceId: z.string().cuid(),
  verified: z.boolean().optional(),
});

export const domainIdParamSchema = z.object({
  id: z.string().cuid(),
});



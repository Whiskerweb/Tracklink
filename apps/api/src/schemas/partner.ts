import { z } from "zod";

export const createPartnerSchema = z.object({
  workspaceId: z.string().cuid(),
  email: z.string().email(),
  name: z.string().optional(),
  country: z.string().optional(),
  status: z.enum(["PENDING", "APPROVED", "BANNED"]).optional(),
});

export const updatePartnerSchema = z.object({
  name: z.string().optional(),
  country: z.string().optional(),
  status: z.enum(["PENDING", "APPROVED", "BANNED"]).optional(),
});

export const getPartnersQuerySchema = z.object({
  workspaceId: z.string().cuid(),
  status: z.enum(["PENDING", "APPROVED", "BANNED"]).optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  cursor: z.string().cuid().optional(),
});

export const partnerIdParamSchema = z.object({
  id: z.string().cuid(),
});

export const createPartnerLinkSchema = z.object({
  workspaceId: z.string().cuid(),
  partnerId: z.string().cuid(),
  linkId: z.string().cuid(),
});

export const analyticsQuerySchema = z.object({
  partnerId: z.string().cuid(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  groupBy: z.enum(["day", "week", "month"]).default("day"),
});



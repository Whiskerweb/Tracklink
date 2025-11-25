import { FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { Prisma, prisma } from "@tracking/shared";
import { trackLeadSchema, trackSaleSchema } from "../schemas/tracking";
import { ensureIdempotent } from "../utils/idempotency";
import { calculateAndCreateCommission } from "../utils/commissions";
import { logger } from "../logger";
import Decimal from "decimal.js";

const EVENT_LEAD = "lead";
const EVENT_SALE = "sale";

/**
 * Upsert Customer avec logique d'attribution (first/last click)
 */
async function upsertCustomerWithAttribution(
  workspaceId: string,
  customerExternalId: string,
  clickId: string | null,
  updateData?: {
    email?: string;
    name?: string;
    country?: string;
    incrementLeads?: boolean;
    incrementSales?: boolean;
    salesAmount?: Decimal;
  }
): Promise<void> {
  if (!clickId) {
    // Si pas de clickId, on fait un upsert simple sans attribution
    await prisma.customer.upsert({
      where: {
        workspaceId_externalId: {
          workspaceId,
          externalId: customerExternalId,
        },
      },
      create: {
        workspaceId,
        externalId: customerExternalId,
        email: updateData?.email,
        name: updateData?.name,
        country: updateData?.country,
        totalLeadsCount: updateData?.incrementLeads ? 1 : 0,
        totalSalesCount: updateData?.incrementSales ? 1 : 0,
        totalSalesAmount: updateData?.salesAmount ?? new Decimal(0),
      },
      update: {
        ...(updateData?.email && { email: updateData.email }),
        ...(updateData?.name && { name: updateData.name }),
        ...(updateData?.country && { country: updateData.country }),
        ...(updateData?.incrementLeads && {
          totalLeadsCount: { increment: 1 },
        }),
        ...(updateData?.incrementSales && {
          totalSalesCount: { increment: 1 },
        }),
        ...(updateData?.salesAmount && {
          totalSalesAmount: { increment: updateData.salesAmount },
        }),
      },
    });
    return;
  }

  // Avec clickId : logique d'attribution
  const existingCustomer = await prisma.customer.findUnique({
    where: {
      workspaceId_externalId: {
        workspaceId,
        externalId: customerExternalId,
      },
    },
  });

  if (!existingCustomer) {
    // CREATE : initialiser firstSeenClickId et lastSeenClickId avec le clickId actuel
    await prisma.customer.create({
      data: {
        workspaceId,
        externalId: customerExternalId,
        email: updateData?.email,
        name: updateData?.name,
        country: updateData?.country,
        firstSeenClickId: clickId,
        lastSeenClickId: clickId,
        totalLeadsCount: updateData?.incrementLeads ? 1 : 0,
        totalSalesCount: updateData?.incrementSales ? 1 : 0,
        totalSalesAmount: updateData?.salesAmount ?? new Decimal(0),
      },
    });
  } else {
    // UPDATE : NE JAMAIS écraser firstSeenClickId, TOUJOURS mettre à jour lastSeenClickId
    await prisma.customer.update({
      where: {
        workspaceId_externalId: {
          workspaceId,
          externalId: customerExternalId,
        },
      },
      data: {
        ...(updateData?.email && { email: updateData.email }),
        ...(updateData?.name && { name: updateData.name }),
        ...(updateData?.country && { country: updateData.country }),
        firstSeenClickId: existingCustomer.firstSeenClickId ?? clickId, // Ne jamais écraser si existe
        lastSeenClickId: clickId, // Toujours mettre à jour
        ...(updateData?.incrementLeads && {
          totalLeadsCount: { increment: 1 },
        }),
        ...(updateData?.incrementSales && {
          totalSalesCount: { increment: 1 },
        }),
        ...(updateData?.salesAmount && {
          totalSalesAmount: { increment: updateData.salesAmount },
        }),
      },
    });
  }
}

export async function registerTrackingRoutes(app: FastifyInstance): Promise<void> {
  app.post("/track/lead", async (request, reply) => {
    try {
      const payload = trackLeadSchema.parse(request.body);
      const click = payload.clickId
        ? await prisma.clickEvent.findUnique({
            where: {
              workspaceId_clickId: {
                workspaceId: payload.workspaceId,
                clickId: payload.clickId,
              },
            },
          })
        : null;

      const lead = await prisma.leadEvent.create({
        data: {
          workspaceId: payload.workspaceId,
          clickId: click?.clickId ?? payload.clickId ?? null,
          customerExternalId: payload.customerExternalId,
          eventName: payload.eventName,
          metadata: payload.metadata,
          partnerId: click?.partnerId,
          partnerLinkId: click?.partnerLinkId,
        },
      });

      await ensureIdempotent({
        workspaceId: payload.workspaceId,
        key: payload.idempotencyKey,
        eventType: EVENT_LEAD,
        resourceId: lead.id,
      });

      queueMicrotask(async () => {
        logger.info(
          {
            event: "lead_tracked",
            workspaceId: payload.workspaceId,
            leadId: lead.id,
            clickId: lead.clickId,
            partnerId: lead.partnerId,
          },
          "Lead tracked"
        );

        // Upsert Customer avec attribution
        await upsertCustomerWithAttribution(
          payload.workspaceId,
          payload.customerExternalId,
          lead.clickId ?? null,
          {
            email: payload.metadata && typeof payload.metadata === "object" && "email" in payload.metadata
              ? String(payload.metadata.email)
              : undefined,
            name: payload.metadata && typeof payload.metadata === "object" && "name" in payload.metadata
              ? String(payload.metadata.name)
              : undefined,
            incrementLeads: true,
          }
        );

        // Calculate commission if partner exists
        if (lead.partnerId) {
          await calculateAndCreateCommission({
            workspaceId: payload.workspaceId,
            partnerId: lead.partnerId,
            eventId: lead.id,
            eventType: "lead",
          });
        }
      });

      return reply.code(202).send({ id: lead.id });
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({ error: "Invalid payload", details: error.flatten() });
      }
      if (isUniqueConstraintError(error)) {
        const payload = request.body as { workspaceId: string; eventName: string; customerExternalId: string };
        const existing = await prisma.leadEvent.findUnique({
          where: {
            workspaceId_eventName_customerExternalId: {
              workspaceId: payload.workspaceId,
              eventName: payload.eventName,
              customerExternalId: payload.customerExternalId,
            },
          },
        });
        return reply.code(200).send({ id: existing?.id, duplicate: true });
      }
      logger.error(error, "Failed to track lead");
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  app.post("/track/sale", async (request, reply) => {
    try {
      const payload = trackSaleSchema.parse(request.body);

      const click = payload.clickId
        ? await prisma.clickEvent.findUnique({
            where: {
              workspaceId_clickId: {
                workspaceId: payload.workspaceId,
                clickId: payload.clickId,
              },
            },
          })
        : null;

      const sale = await prisma.saleEvent.create({
        data: {
          workspaceId: payload.workspaceId,
          clickId: click?.clickId ?? payload.clickId ?? null,
          customerExternalId: payload.customerExternalId,
          amount: payload.amount,
          currency: payload.currency.toUpperCase(),
          invoiceId: payload.invoiceId,
          paymentProcessor: payload.paymentProcessor,
          metadata: payload.metadata,
          partnerId: click?.partnerId,
          partnerLinkId: click?.partnerLinkId,
        },
      });

      const idempotency = await ensureIdempotent({
        workspaceId: payload.workspaceId,
        key: payload.idempotencyKey ?? payload.invoiceId ?? undefined,
        eventType: EVENT_SALE,
        resourceId: sale.id,
      });

      if (idempotency.alreadyProcessed) {
        return reply.code(200).send({ id: idempotency.resourceId, duplicate: true });
      }

      queueMicrotask(async () => {
        logger.info(
          {
            event: "sale_tracked",
            workspaceId: payload.workspaceId,
            saleId: sale.id,
            clickId: sale.clickId,
            amount: payload.amount,
          },
          "Sale tracked"
        );

        // Upsert Customer avec attribution
        const salesAmount = new Decimal(payload.amount);
        await upsertCustomerWithAttribution(
          payload.workspaceId,
          payload.customerExternalId,
          sale.clickId ?? null,
          {
            email: payload.metadata && typeof payload.metadata === "object" && "email" in payload.metadata
              ? String(payload.metadata.email)
              : undefined,
            name: payload.metadata && typeof payload.metadata === "object" && "name" in payload.metadata
              ? String(payload.metadata.name)
              : undefined,
            incrementSales: true,
            salesAmount,
          }
        );

        // Calculate commission if partner exists
        if (sale.partnerId) {
          await calculateAndCreateCommission({
            workspaceId: payload.workspaceId,
            partnerId: sale.partnerId,
            eventId: sale.id,
            eventType: "sale",
            amount: payload.amount,
            currency: payload.currency,
          });
        }
      });

      return reply.code(202).send({ id: sale.id });
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({ error: "Invalid payload", details: error.flatten() });
      }
      if (isUniqueConstraintError(error)) {
        const payload = request.body as { workspaceId: string; invoiceId?: string | null };
        if (payload.invoiceId) {
          const existing = await prisma.saleEvent.findUnique({
            where: {
              workspaceId_invoiceId: {
                workspaceId: payload.workspaceId,
                invoiceId: payload.invoiceId,
              },
            },
          });
          return reply.code(200).send({ id: existing?.id, duplicate: true });
        }
      }
      logger.error(error, "Failed to track sale");
      return reply.code(500).send({ error: "Internal server error" });
    }
  });
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
  );
}


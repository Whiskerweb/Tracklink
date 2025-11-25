import { beforeAll, afterAll, beforeEach } from "vitest";
import { prisma } from "@tracking/shared";

beforeAll(async () => {
  // Cleanup before all tests
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  // Clean test data before each test
  await prisma.clickEvent.deleteMany();
  await prisma.leadEvent.deleteMany();
  await prisma.saleEvent.deleteMany();
  await prisma.link.deleteMany();
  await prisma.idempotencyKey.deleteMany();
});



import { PrismaClient } from '@prisma/client';

/**
 * Prisma client singleton.
 *
 * Ensures a single Prisma instance across reloads (in dev) to prevent
 * connection exhaustion and reduce overhead. In production, a new client is
 * used per process.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        log: ['error'],
    });

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}

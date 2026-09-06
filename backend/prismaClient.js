const { PrismaClient } = require('@prisma/client');
const { withAccelerate } = require('@prisma/extension-accelerate');

const globalForPrisma = global;

const basePrisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

const prisma = process.env.DATABASE_URL?.startsWith('prisma://')
  ? basePrisma.$extends(withAccelerate())
  : basePrisma;

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = basePrisma;

module.exports = prisma;

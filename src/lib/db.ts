import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { env } from './env'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({
      connectionString: env.DATABASE_URL,
      // Fast fail during build when DB isn't available (prevents 60s timeout)
      connectionTimeoutMillis: 5000,
    }),
    log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (env.NODE_ENV !== 'production') globalForPrisma.prisma = db

export default db

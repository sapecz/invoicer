import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function getPrismaDatabaseUrl() {
  const raw = process.env.DATABASE_URL?.trim()
  if (!raw) {
    return undefined
  }

  try {
    const parsed = new URL(raw)
    const isSupabasePooler = parsed.hostname.includes('pooler.supabase.com') || parsed.port === '6543'
    if (!isSupabasePooler) {
      return raw
    }

    // Supabase pooler (pgBouncer transaction mode) is sensitive to prepared statements.
    // These flags keep Prisma compatible even if env vars are misconfigured in deployment.
    if (parsed.searchParams.get('pgbouncer') !== 'true') {
      parsed.searchParams.set('pgbouncer', 'true')
    }
    if (!parsed.searchParams.get('connection_limit')) {
      parsed.searchParams.set('connection_limit', '1')
    }

    return parsed.toString()
  } catch {
    return raw
  }
}

const datasourceUrl = getPrismaDatabaseUrl()

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'],
    ...(datasourceUrl
      ? {
          datasources: {
            db: {
              url: datasourceUrl,
            },
          },
        }
      : {}),
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

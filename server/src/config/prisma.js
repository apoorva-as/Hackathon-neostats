// Shared Prisma Client instance. Import `prisma` from here; never create
// another PrismaClient elsewhere (each one opens its own connection pool).
// Creating the client does not connect: Prisma connects on the first query.
import { PrismaClient } from '@prisma/client'

export const prisma = new PrismaClient()

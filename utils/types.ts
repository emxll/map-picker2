import { Prisma } from '@prisma/client'
export type CGame = Prisma.GameGetPayload<{
  include: { bans: true, maps: true }
}>
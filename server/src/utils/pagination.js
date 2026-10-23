// Turns validated { page, limit } into Prisma skip/take plus response metadata.
export function paginate({ page, limit }) {
  return { skip: (page - 1) * limit, take: limit }
}

export function pageMeta({ page, limit }, total) {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }
}

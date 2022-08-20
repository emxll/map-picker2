export const port = parseInt(process.env.PORT || '3000', 10);
export const isClient = typeof window !== "undefined";
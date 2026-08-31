import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  return new PrismaClient()
}

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

// Lazy-loaded prisma client using a Proxy
let internalPrisma: PrismaClient | null = null;

const prisma = new Proxy({} as PrismaClient, {
  get(target, prop, receiver) {
    // Prevent instantiating Prisma Client during React/Next.js framework property checks
    if (
      typeof prop === "symbol" ||
      prop === "then" ||
      prop === "toJSON" ||
      prop === "constructor" ||
      (typeof prop === "string" && prop.startsWith("$$"))
    ) {
      return undefined;
    }

    if (!internalPrisma) {
      internalPrisma = globalThis.prismaGlobal ?? prismaClientSingleton();
      if (process.env.NODE_ENV !== 'production') {
        globalThis.prismaGlobal = internalPrisma;
      }
    }
    const value = Reflect.get(internalPrisma, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(internalPrisma);
    }
    return value;
  }
});

export default prisma

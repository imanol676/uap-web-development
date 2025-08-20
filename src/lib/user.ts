import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { randomInt } from "crypto";

const COOKIE_NAME = "userId";

export async function ensureUser() {
  const store = await cookies();
  let userId = store.get(COOKIE_NAME)?.value;

  if (userId) {
    const exists = await prisma.user.findUnique({ where: { id: userId } });
    if (exists) return exists;
  }

  // Crear usuario “Guest-xxxx”
  const name = `Guest-${randomInt(1000, 9999)}`;
  const user = await prisma.user.create({
    data: { name },
  });

  // cookie por 365 días
  store.set({
    name: COOKIE_NAME,
    value: user.id,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return user;
}

export async function getUserId() {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value ?? null;
}

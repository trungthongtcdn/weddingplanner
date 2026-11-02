import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { newId, newToken, sha256 } from "@/lib/ids";

const COOKIE = "tn_session";
const SESSION_DAYS = 30;

export type CurrentUser = { id: string; phone: string; name: string | null };

export async function createSession(phone: string): Promise<CurrentUser> {
  let [user] = await db.select().from(schema.users).where(eq(schema.users.phone, phone)).limit(1);
  if (!user) {
    user = { id: newId(), phone, name: null, createdAt: new Date() };
    await db.insert(schema.users).values(user);
  }
  const token = newToken(32);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(schema.sessions).values({ id: sha256(token), userId: user.id, expiresAt, createdAt: new Date() });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
  return { id: user.id, phone: user.phone, name: user.name };
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.delete(schema.sessions).where(eq(schema.sessions.id, sha256(token)));
  jar.delete(COOKIE);
}

/** Người dùng hiện tại, hoặc null. Gộp lời gọi trong cùng một request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const [row] = await db
    .select({ user: schema.users, expiresAt: schema.sessions.expiresAt })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.sessions.userId, schema.users.id))
    .where(eq(schema.sessions.id, sha256(token)))
    .limit(1);
  if (!row || row.expiresAt.getTime() < Date.now()) return null;
  return { id: row.user.id, phone: row.user.phone, name: row.user.name };
});

export async function requireUser(next?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(next ? `/dang-nhap?next=${encodeURIComponent(next)}` : "/dang-nhap");
  return user;
}


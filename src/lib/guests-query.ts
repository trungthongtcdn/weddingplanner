import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { Side } from "@/lib/db/schema";

export type GuestRow = typeof schema.guests.$inferSelect & { partyIds: string[] };

export async function loadGuests(weddingId: string, sides: Side[]): Promise<GuestRow[]> {
  if (!sides.length) return [];
  const guests = await db
    .select()
    .from(schema.guests)
    .where(and(eq(schema.guests.weddingId, weddingId), inArray(schema.guests.side, sides)))
    .orderBy(asc(schema.guests.createdAt));
  if (!guests.length) return [];
  const links = await db
    .select()
    .from(schema.guestParties)
    .where(inArray(schema.guestParties.guestId, guests.map((g) => g.id)));
  const byGuest = new Map<string, string[]>();
  for (const l of links) byGuest.set(l.guestId, [...(byGuest.get(l.guestId) ?? []), l.partyId]);
  return guests.map((g) => ({ ...g, partyIds: byGuest.get(g.id) ?? [] }));
}

export async function loadParties(weddingId: string) {
  return db.select().from(schema.parties).where(eq(schema.parties.weddingId, weddingId)).orderBy(asc(schema.parties.sortOrder), asc(schema.parties.startsAt));
}

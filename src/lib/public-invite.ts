import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export async function loadInvite(token: string) {
  const [row] = await db
    .select({ guest: schema.guests, wedding: schema.weddings })
    .from(schema.guests)
    .innerJoin(schema.weddings, eq(schema.guests.weddingId, schema.weddings.id))
    .where(eq(schema.guests.inviteToken, token))
    .limit(1);
  if (!row) return null;
  const links = await db.select().from(schema.guestParties).where(eq(schema.guestParties.guestId, row.guest.id));
  const all = await db.select().from(schema.parties).where(eq(schema.parties.weddingId, row.wedding.id));
  let parties = links.length ? all.filter((p) => links.some((l) => l.partyId === p.id)) : all.filter((p) => row.guest.side === "CAP_DOI" || p.side === row.guest.side);
  if (!parties.length) parties = all;
  parties.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const [fund] = await db
    .select()
    .from(schema.funds)
    .where(and(eq(schema.funds.weddingId, row.wedding.id), inArray(schema.funds.side, [row.guest.side])))
    .limit(1);
  return { ...row, parties, fund: fund ?? null };
}

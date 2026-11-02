import "server-only";
import { db, schema } from "@/lib/db";
import { newId } from "@/lib/ids";
import { TASK_TEMPLATES, addDays } from "@/lib/rituals";
import type { Region } from "@/lib/db/schema";

export type NewWeddingInput = {
  userId: string;
  myName: string;
  groomName: string;
  brideName: string;
  groomRegion: Region;
  brideRegion: Region;
  groomProvince?: string | null;
  brideProvince?: string | null;
  weddingDate: string;
  groomBirthYear?: number | null;
  brideBirthYear?: number | null;
};

export async function createWedding(input: NewWeddingInput): Promise<string> {
  const now = new Date();
  const weddingId = newId();
  const memberId = newId();
  await db.transaction(async (tx) => {
    await tx.insert(schema.weddings).values({
      id: weddingId,
      groomName: input.groomName,
      brideName: input.brideName,
      groomRegion: input.groomRegion,
      brideRegion: input.brideRegion,
      groomProvince: input.groomProvince || null,
      brideProvince: input.brideProvince || null,
      weddingDate: input.weddingDate,
      groomBirthYear: input.groomBirthYear ?? null,
      brideBirthYear: input.brideBirthYear ?? null,
      inviteMessage: null,
      giftQrEnabled: true,
      createdBy: input.userId,
      createdAt: now,
    });
    await tx.insert(schema.members).values({
      id: memberId,
      weddingId,
      userId: input.userId,
      role: "COUPLE",
      displayName: input.myName,
      createdAt: now,
    });
    await tx.insert(schema.funds).values(
      (["CAP_DOI", "NHA_TRAI", "NHA_GAI"] as const).map((side) => ({
        id: newId(),
        weddingId,
        side,
        coupleCanView: side !== "CAP_DOI",
      })),
    );
    await tx.insert(schema.parties).values([
      { id: newId(), weddingId, side: "NHA_GAI" as const, name: "Tiệc nhà gái", startsAt: `${input.weddingDate}T11:00`, seatsPerTable: 10, sortOrder: 0 },
      { id: newId(), weddingId, side: "NHA_TRAI" as const, name: "Tiệc nhà trai", startsAt: `${input.weddingDate}T17:30`, seatsPerTable: 10, sortOrder: 1 },
    ]);
    const today = now.toISOString().slice(0, 10);
    await tx.insert(schema.tasks).values(
      TASK_TEMPLATES.map((t) => {
        const due = addDays(input.weddingDate, t.offsetDays);
        return {
          id: newId(),
          weddingId,
          ceremony: t.ceremony,
          title: t.title,
          // Việc có hạn đã qua lúc tạo thì để hạn là hôm nay, người dùng tự đánh dấu nếu đã xong.
          dueDate: due < today && t.offsetDays < 0 ? today : due,
          done: false,
          templateKey: t.key,
          createdAt: now,
        };
      }),
    );
  });
  return weddingId;
}

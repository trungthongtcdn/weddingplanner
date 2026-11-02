"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { getWeddingAccess, canSeeBudget } from "@/lib/access";
import { newId } from "@/lib/ids";
import { CEREMONIES, SIDES } from "@/lib/db/schema";
import { CUSTOM_DIFFERENCES, speechTemplate } from "@/lib/rituals";
import { aiRewrite } from "@/lib/ai";

export type FormState = { error?: string; ok?: string };

export async function saveDecisionAction(weddingId: string, key: string, _prev: FormState, form: FormData): Promise<FormState> {
  const access = await getWeddingAccess(weddingId);
  if (access.member.role === "HELPER") return { error: "Bạn chỉ có quyền xem." };
  if (!CUSTOM_DIFFERENCES.some((d) => d.key === key)) return { error: "Không tìm thấy mục này." };
  const choice = z.enum(["GROOM", "BRIDE", "CUSTOM"]).safeParse(form.get("choice"));
  if (!choice.success) return { error: "Chọn một cách làm." };
  const note = String(form.get("note") ?? "").trim().slice(0, 300) || null;
  if (choice.data === "CUSTOM" && !note) return { error: "Ghi lại cách làm hai nhà đã thống nhất." };
  const confirmed = form.get("confirmed") === "on";
  await db
    .insert(schema.decisions)
    .values({ id: newId(), weddingId, key, choice: choice.data, note, confirmed, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [schema.decisions.weddingId, schema.decisions.key],
      set: { choice: choice.data, note, confirmed, updatedAt: new Date() },
    });
  revalidatePath(`/cuoi/${weddingId}`, "layout");
  return { ok: confirmed ? "Đã chốt." : "Đã lưu, chưa chốt." };
}

/* ------------------------------- Việc ------------------------------- */

async function taskForMember(weddingId: string, taskId: string) {
  const access = await getWeddingAccess(weddingId);
  const [task] = await db.select().from(schema.tasks).where(and(eq(schema.tasks.id, taskId), eq(schema.tasks.weddingId, weddingId))).limit(1);
  if (!task) return null;
  if (access.member.role === "HELPER" && task.assigneeMemberId !== access.member.id) return null;
  return { access, task };
}

export async function toggleTaskAction(weddingId: string, taskId: string) {
  const r = await taskForMember(weddingId, taskId);
  if (!r) return;
  await db.update(schema.tasks).set({ done: !r.task.done }).where(eq(schema.tasks.id, taskId));
  revalidatePath(`/cuoi/${weddingId}`, "layout");
}

export async function assignTaskAction(weddingId: string, taskId: string, form: FormData) {
  const r = await taskForMember(weddingId, taskId);
  if (!r || r.access.member.role === "HELPER") return;
  const assignee = String(form.get("assignee") ?? "") || null;
  if (assignee) {
    const [m] = await db.select({ id: schema.members.id }).from(schema.members).where(and(eq(schema.members.id, assignee), eq(schema.members.weddingId, weddingId)));
    if (!m) return;
  }
  const due = String(form.get("dueDate") ?? "");
  await db
    .update(schema.tasks)
    .set({ assigneeMemberId: assignee, dueDate: /^\d{4}-\d{2}-\d{2}$/.test(due) ? due : r.task.dueDate })
    .where(eq(schema.tasks.id, taskId));
  revalidatePath(`/cuoi/${weddingId}`, "layout");
}

export async function deleteTaskAction(weddingId: string, taskId: string) {
  const r = await taskForMember(weddingId, taskId);
  if (!r || r.access.member.role === "HELPER") return;
  await db.delete(schema.tasks).where(eq(schema.tasks.id, taskId));
  revalidatePath(`/cuoi/${weddingId}`, "layout");
}

export async function addTaskAction(weddingId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const access = await getWeddingAccess(weddingId);
  if (access.member.role === "HELPER") return { error: "Bạn chỉ có quyền đánh dấu việc của mình." };
  const parsed = z
    .object({
      title: z.string().trim().min(2, "Nhập tên việc").max(160),
      ceremony: z.enum([...CEREMONIES, "CHUNG"] as const),
      dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
      assignee: z.string().optional(),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Thông tin chưa đúng" };
  const d = parsed.data;
  let assigneeMemberId: string | null = null;
  if (d.assignee) {
    const [m] = await db.select({ id: schema.members.id }).from(schema.members).where(and(eq(schema.members.id, d.assignee), eq(schema.members.weddingId, weddingId)));
    assigneeMemberId = m?.id ?? null;
  }
  await db.insert(schema.tasks).values({
    id: newId(),
    weddingId,
    ceremony: d.ceremony,
    title: d.title,
    dueDate: d.dueDate || null,
    assigneeMemberId,
    done: false,
    createdAt: new Date(),
  });
  revalidatePath(`/cuoi/${weddingId}`, "layout");
  return { ok: "Đã thêm việc." };
}

/* ----------------------------- Ngân sách ---------------------------- */

const money = z
  .string()
  .optional()
  .transform((v) => (v ? Number(v.replace(/\D/g, "")) : 0));

export async function addBudgetItemAction(weddingId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const access = await getWeddingAccess(weddingId);
  if (!canSeeBudget(access.member.role)) return { error: "Bạn không có quyền với ngân sách." };
  const parsed = z
    .object({ title: z.string().trim().min(2, "Nhập khoản chi").max(120), payer: z.enum(SIDES), planned: money })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Thông tin chưa đúng" };
  await db.insert(schema.budgetItems).values({ id: newId(), weddingId, ...parsed.data, actual: null, createdAt: new Date() });
  revalidatePath(`/cuoi/${weddingId}/ngan-sach`);
  return { ok: "Đã thêm khoản chi." };
}

export async function updateBudgetActualAction(weddingId: string, itemId: string, form: FormData) {
  const access = await getWeddingAccess(weddingId);
  if (!canSeeBudget(access.member.role)) return;
  const raw = String(form.get("actual") ?? "").replace(/\D/g, "");
  await db
    .update(schema.budgetItems)
    .set({ actual: raw ? Number(raw) : null })
    .where(and(eq(schema.budgetItems.id, itemId), eq(schema.budgetItems.weddingId, weddingId)));
  revalidatePath(`/cuoi/${weddingId}/ngan-sach`);
}

export async function deleteBudgetItemAction(weddingId: string, itemId: string) {
  const access = await getWeddingAccess(weddingId);
  if (!canSeeBudget(access.member.role)) return;
  await db.delete(schema.budgetItems).where(and(eq(schema.budgetItems.id, itemId), eq(schema.budgetItems.weddingId, weddingId)));
  revalidatePath(`/cuoi/${weddingId}/ngan-sach`);
}

/* --------------------------- Bài phát biểu -------------------------- */

export type SpeechState = { text: string; error?: string; polished?: boolean };

export async function polishSpeechAction(weddingId: string, prev: SpeechState, form: FormData): Promise<SpeechState> {
  const access = await getWeddingAccess(weddingId);
  const ceremony = z.enum(CEREMONIES).catch("AN_HOI").parse(form.get("ceremony"));
  const side = z.enum(["NHA_TRAI", "NHA_GAI"]).catch("NHA_TRAI").parse(form.get("side"));
  const speakerTitle = String(form.get("speakerTitle") ?? "").slice(0, 80);
  const tone = String(form.get("tone") ?? "trang trọng");
  const base =
    String(form.get("text") ?? "").trim() ||
    speechTemplate({ ceremony, side, groomName: access.wedding.groomName, brideName: access.wedding.brideName, speakerTitle });
  const out = await aiRewrite({
    instruction: `Chỉnh bài phát biểu dưới đây cho tự nhiên, giọng ${tone}, dài khoảng 1–2 phút khi đọc. Giữ đúng tên người và vai trò người nói.`,
    base,
  });
  if (!out) return { text: base, error: "Chưa bật trợ lý AI hoặc AI đang bận. Bạn vẫn dùng được bản mẫu." };
  return { text: out, polished: true };
}

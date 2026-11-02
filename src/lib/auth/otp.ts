import "server-only";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { randomInt, timingSafeEqual } from "node:crypto";
import { db, schema } from "@/lib/db";
import { newId, sha256 } from "@/lib/ids";

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_SENDS_PER_HOUR = 5;
const MAX_ATTEMPTS = 5;

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s && process.env.NODE_ENV === "production") throw new Error("Thiếu SESSION_SECRET");
  return s ?? "tram-nam-dev-secret";
}

const hashCode = (phone: string, code: string) => sha256(`${phone}:${code}:${secret()}`);

/** Có hiện mã OTP ngay trên màn hình không (chỉ dùng khi phát triển / thử nghiệm nội bộ). */
export function otpShownOnScreen(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.OTP_DEV_SHOW === "1";
}

async function deliver(phone: string, code: string): Promise<void> {
  const webhook = process.env.OTP_WEBHOOK_URL;
  if (webhook) {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "content-type": "application/json", ...(process.env.OTP_WEBHOOK_TOKEN ? { authorization: `Bearer ${process.env.OTP_WEBHOOK_TOKEN}` } : {}) },
      body: JSON.stringify({ phone, code, message: `Ma dang nhap Tram Nam cua ban la ${code}. Ma co hieu luc 5 phut.` }),
    });
    if (!res.ok) throw new Error(`Gửi OTP thất bại (${res.status})`);
    return;
  }
  if (!otpShownOnScreen()) throw new Error("Chưa cấu hình kênh gửi OTP (OTP_WEBHOOK_URL)");
  console.info(`[OTP] ${phone}: ${code}`);
}

export type RequestOtpResult = { ok: true; devCode?: string } | { ok: false; error: string };

export async function requestOtp(phone: string): Promise<RequestOtpResult> {
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await db
    .select({ id: schema.otpCodes.id })
    .from(schema.otpCodes)
    .where(and(eq(schema.otpCodes.phone, phone), gt(schema.otpCodes.createdAt, hourAgo)));
  if (recent.length >= MAX_SENDS_PER_HOUR) {
    return { ok: false, error: "Bạn đã yêu cầu mã quá nhiều lần. Thử lại sau một giờ." };
  }
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const now = new Date();
  await db.insert(schema.otpCodes).values({
    id: newId(),
    phone,
    codeHash: hashCode(phone, code),
    expiresAt: new Date(now.getTime() + OTP_TTL_MS),
    createdAt: now,
  });
  try {
    await deliver(phone, code);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Không gửi được mã" };
  }
  return { ok: true, devCode: otpShownOnScreen() ? code : undefined };
}

/** Kiểm tra mã; đúng thì đánh dấu đã dùng và trả về true. */
export async function verifyOtp(phone: string, code: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const [row] = await db
    .select()
    .from(schema.otpCodes)
    .where(and(eq(schema.otpCodes.phone, phone), isNull(schema.otpCodes.consumedAt), gt(schema.otpCodes.expiresAt, new Date())))
    .orderBy(desc(schema.otpCodes.createdAt))
    .limit(1);
  if (!row) return { ok: false, error: "Mã đã hết hạn. Bấm gửi lại mã." };
  if (row.attempts >= MAX_ATTEMPTS) return { ok: false, error: "Nhập sai quá nhiều lần. Bấm gửi lại mã." };
  const expected = Buffer.from(row.codeHash);
  const actual = Buffer.from(hashCode(phone, code.trim()));
  const match = expected.length === actual.length && timingSafeEqual(expected, actual);
  if (!match) {
    await db.update(schema.otpCodes).set({ attempts: row.attempts + 1 }).where(eq(schema.otpCodes.id, row.id));
    return { ok: false, error: "Mã chưa đúng. Kiểm tra lại tin nhắn." };
  }
  await db.update(schema.otpCodes).set({ consumedAt: new Date() }).where(eq(schema.otpCodes.id, row.id));
  return { ok: true };
}

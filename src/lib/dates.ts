/** Ngày hôm nay theo giờ Việt Nam (YYYY-MM-DD). */
export function todayVn(): string {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function daysBetween(fromIso: string, toIso: string): number {
  const a = Date.UTC(+fromIso.slice(0, 4), +fromIso.slice(5, 7) - 1, +fromIso.slice(8, 10));
  const b = Date.UTC(+toIso.slice(0, 4), +toIso.slice(5, 7) - 1, +toIso.slice(8, 10));
  return Math.round((b - a) / 86_400_000);
}

const WEEKDAYS = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"];

/** "Thứ bảy, 16/01/2027" */
export function formatDateVn(iso: string, withWeekday = true): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const wd = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  const s = `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
  return withWeekday ? `${wd}, ${s}` : s;
}

/** "11:00, Thứ bảy 16/01/2027" từ "2027-01-16T11:00" */
export function formatDateTimeVn(local: string): string {
  const time = local.slice(11, 16);
  return `${time}, ${formatDateVn(local.slice(0, 10))}`;
}

export function countdownText(weddingDate: string): string {
  const n = daysBetween(todayVn(), weddingDate);
  if (n > 1) return `Còn ${n} ngày`;
  if (n === 1) return "Ngày mai cưới";
  if (n === 0) return "Hôm nay cưới";
  return `Đã cưới ${-n} ngày`;
}

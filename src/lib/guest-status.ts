import type { CallResult, GuestStatus } from "./db/schema";

export const STATUS_ORDER: GuestStatus[] = ["CHUA_MOI", "DA_GOI", "DA_GUI_THIEP", "DA_MO", "CO_MAT", "DA_MUNG"];

export const STATUS_LABEL: Record<GuestStatus, string> = {
  CHUA_MOI: "Chưa mời",
  DA_GOI: "Đã gọi",
  DA_GUI_THIEP: "Đã gửi thiệp",
  DA_MO: "Đã mở thiệp",
  CO_MAT: "Có mặt",
  DA_MUNG: "Đã mừng",
};

export const CALL_LABEL: Record<CallResult, string> = {
  SE_DI: "Sẽ đi",
  CHUA_CHAC: "Chưa chắc",
  KHONG_DI: "Không đi được",
  KHONG_NGHE: "Không nghe máy",
};

/** Chỉ tiến trạng thái lên, không lùi (ví dụ đã mở thiệp thì gọi lại vẫn giữ "Đã mở"). */
export function advance(current: GuestStatus, to: GuestStatus): GuestStatus {
  return STATUS_ORDER.indexOf(to) > STATUS_ORDER.indexOf(current) ? to : current;
}

export type EstimateGuest = { status: GuestStatus; callResult: CallResult | null };

/**
 * Ước lượng số khách đến một tiệc, dạng khoảng:
 * - thấp = những người đã nói "sẽ đi" (hoặc đã có mặt);
 * - cao = thêm những người "chưa chắc", chưa trả lời, chưa liên lạc được.
 * Người đã nói "không đi được" không được tính.
 */
export function estimateAttendance(guests: EstimateGuest[], seatsPerTable: number) {
  let low = 0;
  let unsure = 0;
  let declined = 0;
  for (const g of guests) {
    if (g.callResult === "KHONG_DI") declined++;
    else if (g.callResult === "SE_DI" || g.status === "CO_MAT" || g.status === "DA_MUNG") low++;
    else unsure++;
  }
  const high = low + unsure;
  return {
    invited: guests.length,
    low,
    high,
    declined,
    tablesLow: Math.ceil(low / seatsPerTable),
    tablesHigh: Math.ceil(high / seatsPerTable),
  };
}

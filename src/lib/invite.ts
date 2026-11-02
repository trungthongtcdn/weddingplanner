import { formatDateTimeVn } from "./dates";

type W = { groomName: string; brideName: string; inviteMessage: string | null };
type G = { name: string; honorific: string | null };
type P = { name: string; startsAt: string; venue: string | null; address: string | null };

export function guestAddress(g: G): string {
  return g.honorific ? `${g.honorific} ${g.name}` : g.name;
}

/** Lời mời gửi qua Zalo, kèm link thiệp riêng của khách. */
export function buildInviteMessage(w: W, g: G, parties: P[], url: string): string {
  const who = guestAddress(g);
  const head = w.inviteMessage
    ? w.inviteMessage.replaceAll("{ten}", who)
    : `Kính mời ${who} đến dự lễ thành hôn của ${w.groomName} và ${w.brideName}.`;
  const lines = parties.map((p) => `• ${p.name}: ${formatDateTimeVn(p.startsAt)}${p.venue ? ` tại ${p.venue}` : ""}`);
  return [head, ...lines, `Thiệp mời và chỉ đường: ${url}`].join("\n");
}

export function buildThankYouMessage(w: W, g: G, coupleSide: string): string {
  const who = guestAddress(g);
  return `${coupleSide} xin chân thành cảm ơn ${who} đã đến chung vui và gửi lời chúc trong ngày cưới của ${w.groomName} và ${w.brideName}. Chúc ${who} và gia đình nhiều sức khỏe, may mắn!`;
}

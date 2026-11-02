import { loadInvite } from "@/lib/public-invite";

function utcStamp(local: string, addHours = 0): string {
  // local = "YYYY-MM-DDTHH:mm" giờ Việt Nam (UTC+7)
  const [d, t] = local.split("T");
  const [y, m, day] = d.split("-").map(Number);
  const [hh, mm] = t.split(":").map(Number);
  const ms = Date.UTC(y, m - 1, day, hh - 7 + addHours, mm);
  return new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

export async function GET(_req: Request, ctx: RouteContext<"/t/[token]/lich">) {
  const { token } = await ctx.params;
  const inv = await loadInvite(token);
  if (!inv) return new Response("Không tìm thấy thiệp", { status: 404 });
  const now = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const events = inv.parties.map((p) =>
    [
      "BEGIN:VEVENT",
      `UID:${p.id}-${inv.guest.id}@tramnam`,
      `DTSTAMP:${now}`,
      `DTSTART:${utcStamp(p.startsAt)}`,
      `DTEND:${utcStamp(p.startsAt, 3)}`,
      `SUMMARY:${esc(`${p.name} - cưới ${inv.wedding.groomName} & ${inv.wedding.brideName}`)}`,
      p.address || p.venue ? `LOCATION:${esc([p.venue, p.address].filter(Boolean).join(", "))}` : "",
      "BEGIN:VALARM",
      "TRIGGER:-P1D",
      "ACTION:DISPLAY",
      `DESCRIPTION:${esc(`Ngày mai dự ${p.name}`)}`,
      "END:VALARM",
      "END:VEVENT",
    ]
      .filter(Boolean)
      .join("\r\n"),
  );
  const body = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Tram Nam//VI", "CALSCALE:GREGORIAN", ...events, "END:VCALENDAR"].join("\r\n");
  return new Response(body, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="thiep-cuoi.ics"`,
    },
  });
}

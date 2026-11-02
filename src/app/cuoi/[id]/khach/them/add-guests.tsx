"use client";

import { useMemo, useState, useTransition, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { addGuestsAction, type AddGuestsResult } from "@/app/actions/guests";
import { parseGuestLine, type RecallGroup } from "@/lib/guest-groups";
import { normalizeVnPhone, formatPhone } from "@/lib/phone";

type ContactsNavigator = Navigator & {
  contacts?: { select: (props: string[], opts: { multiple: boolean }) => Promise<{ name?: string[]; tel?: string[] }[]> };
};

const subscribeNoop = () => () => {};
function useContactPickerSupported() {
  return useSyncExternalStore(
    subscribeNoop,
    () => "contacts" in navigator && "ContactsManager" in window,
    () => false,
  );
}

export function AddGuests({
  weddingId,
  sides,
  side,
  groups,
  groupCounts,
  parties,
  defaultParties,
}: {
  weddingId: string;
  sides: { value: string; label: string }[];
  side: string;
  groups: RecallGroup[];
  groupCounts: Record<string, number>;
  parties: { id: string; label: string }[];
  defaultParties: string[];
}) {
  const router = useRouter();
  const firstOpen = groups.find((g) => !groupCounts[g.name]) ?? groups[0];
  const [group, setGroup] = useState<string>(firstOpen.name);
  const [customGroup, setCustomGroup] = useState("");
  const [text, setText] = useState("");
  const [partyIds, setPartyIds] = useState<string[]>(defaultParties);
  const [result, setResult] = useState<(AddGuestsResult & { group: string }) | null>(null);
  const [pending, start] = useTransition();
  const pickerSupported = useContactPickerSupported();

  const parsed = useMemo(
    () =>
      text
        .split("\n")
        .map((l) => parseGuestLine(l))
        .filter((x): x is NonNullable<typeof x> => Boolean(x)),
    [text],
  );
  const groupName = group === "__custom" ? customGroup.trim() : group;
  const current = groups.find((g) => g.name === group);

  async function pickContacts() {
    const nav = navigator as ContactsNavigator;
    if (!nav.contacts) return;
    try {
      const picked = await nav.contacts.select(["name", "tel"], { multiple: true });
      const lines = picked
        .map((c) => {
          const name = c.name?.[0]?.trim();
          const tel = c.tel?.find((t) => normalizeVnPhone(t)) ?? c.tel?.[0];
          return name ? `${name}${tel ? `, ${tel}` : ""}` : null;
        })
        .filter(Boolean);
      if (lines.length) setText((t) => (t.trim() ? t.trimEnd() + "\n" : "") + lines.join("\n"));
    } catch {
      /* người dùng đóng danh bạ */
    }
  }

  function save() {
    if (!parsed.length || !groupName) return;
    start(async () => {
      const res = await addGuestsAction(weddingId, {
        side,
        groupName,
        partyIds,
        guests: parsed.map((p) => ({ name: p.name, honorific: p.honorific, phone: p.phone })),
      });
      setResult({ ...res, group: groupName });
      if (!res.error) {
        setText("");
        const next = groups.find((g) => g.name !== groupName && !groupCounts[g.name]);
        if (next) setGroup(next.name);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-5">
      {sides.length > 1 ? (
        <div>
          <span className="label">Thêm vào danh sách của</span>
          <div className="grid grid-cols-3 gap-2">
            {sides.map((s) => (
              <a
                key={s.value}
                href={`?ben=${s.value}`}
                className={`flex min-h-11 items-center justify-center rounded-xl border text-[0.93rem] font-medium ${s.value === side ? "border-son bg-son-tint text-son-dark" : "border-line bg-surface"}`}
              >
                {s.label}
              </a>
            ))}
          </div>
          <p className="hint">Khách của danh sách nào thì tiền mừng vào quỹ của bên đó.</p>
        </div>
      ) : null}

      <div>
        <span className="label">Nhóm</span>
        <div className="-mx-5 overflow-x-auto px-5 pb-1">
          <div className="flex min-w-max gap-2">
            {groups.map((g) => (
              <button
                key={g.name}
                type="button"
                onClick={() => setGroup(g.name)}
                className={`chip min-h-10 border px-3 ${group === g.name ? "border-son bg-son text-white" : groupCounts[g.name] ? "border-moss/40 bg-moss-tint text-moss" : "border-line bg-surface"}`}
              >
                {g.name}
                {groupCounts[g.name] ? ` · ${groupCounts[g.name]}` : ""}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setGroup("__custom")}
              className={`chip min-h-10 border px-3 ${group === "__custom" ? "border-son bg-son text-white" : "border-line bg-surface"}`}
            >
              Nhóm khác
            </button>
          </div>
        </div>
        {group === "__custom" ? (
          <input value={customGroup} onChange={(e) => setCustomGroup(e.target.value)} className="field mt-2" placeholder="Tên nhóm, ví dụ: Hội đồng hương" />
        ) : current ? (
          <p className="mt-2 rounded-xl bg-kim-tint px-3.5 py-2.5 text-[0.93rem] text-[#4a3610]">{current.prompt}</p>
        ) : null}
      </div>

      <div>
        <label htmlFor="lines" className="label">
          Khách trong nhóm {groupName ? `“${groupName}”` : ""}
        </label>
        <textarea
          id="lines"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="field min-h-40 leading-relaxed"
          placeholder={"Mỗi dòng một người, ví dụ:\nchú Hùng, 0912 345 678\ncô Lan 0987654321\nNguyễn Văn An"}
        />
        <p className="hint">Có thể ghi xưng hô (chú, cô, bác…) trước tên. Số điện thoại không bắt buộc.</p>
        {pickerSupported ? (
          <button type="button" onClick={pickContacts} className="btn-quiet btn-sm mt-2 w-full">
            Chọn từ danh bạ
          </button>
        ) : (
          <p className="hint">Trình duyệt này chưa cho chọn từ danh bạ (Chrome trên Android thì có). Bạn nhập tay hoặc dán danh sách.</p>
        )}
        <p className="hint">Danh bạ chỉ được đọc trên điện thoại của bạn; chỉ những người bạn chọn mới được lưu.</p>
      </div>

      {parsed.length ? (
        <div className="panel rows">
          {parsed.slice(0, 50).map((p, i) => {
            const phone = p.phone ? normalizeVnPhone(p.phone) : null;
            return (
              <div key={i} className="flex items-center justify-between gap-3 px-4 py-2 text-[0.93rem]">
                <span>
                  {p.honorific ? <span className="text-muted">{p.honorific} </span> : null}
                  {p.name}
                </span>
                <span className={p.phone && !phone ? "font-medium text-son" : "text-muted"}>
                  {p.phone ? (phone ? formatPhone(phone) : `${p.rawPhone} — số chưa đúng`) : "không có số"}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}

      {parties.length ? (
        <fieldset>
          <legend className="label">Mời dự tiệc</legend>
          <div className="space-y-2">
            {parties.map((p) => (
              <label key={p.id} className="flex min-h-11 items-center gap-3 rounded-xl border border-line bg-surface px-3.5 text-[0.93rem]">
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-son"
                  checked={partyIds.includes(p.id)}
                  onChange={(e) => setPartyIds((ids) => (e.target.checked ? [...ids, p.id] : ids.filter((x) => x !== p.id)))}
                />
                {p.label}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      {result ? (
        <div className={`rounded-xl border px-3.5 py-3 text-[0.93rem] ${result.error ? "border-son/30 bg-son-tint" : "border-moss/25 bg-moss-tint"}`}>
          {result.error ? (
            result.error
          ) : (
            <>
              <strong>Đã thêm {result.added} khách vào “{result.group}”.</strong>
              {result.duplicates.length ? (
                <div className="mt-1 text-amber">
                  Trùng số điện thoại: {result.duplicates.map((d) => `${d.name} (đã có ${d.existing}, ${d.side})`).join("; ")}.
                </div>
              ) : null}
              {result.invalidPhones.length ? <div className="mt-1 text-amber">Số chưa đúng, đã lưu không kèm số: {result.invalidPhones.join(", ")}.</div> : null}
            </>
          )}
        </div>
      ) : null}

      <button type="button" onClick={save} disabled={pending || !parsed.length || !groupName} className="btn-primary sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] w-full shadow-lg">
        {pending ? "Đang lưu…" : parsed.length ? `Lưu ${parsed.length} khách` : "Nhập ít nhất một khách"}
      </button>
    </div>
  );
}

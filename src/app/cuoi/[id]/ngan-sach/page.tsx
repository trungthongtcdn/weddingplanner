import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getWeddingAccess, canSeeBudget, SIDE_LABEL } from "@/lib/access";
import { BackLink, PageTitle, SectionTitle, Empty } from "@/components/ui";
import { formatVnd } from "@/lib/vn-money";
import { SIDES } from "@/lib/db/schema";
import { updateBudgetActualAction, deleteBudgetItemAction } from "@/app/actions/plan";
import { AddBudgetForm } from "./add-budget-form";

export const metadata: Metadata = { title: "Ngân sách" };

export default async function BudgetPage({ params }: PageProps<"/cuoi/[id]/ngan-sach">) {
  const { id } = await params;
  const { member } = await getWeddingAccess(id);
  if (!canSeeBudget(member.role)) notFound();
  const items = await db.select().from(schema.budgetItems).where(eq(schema.budgetItems.weddingId, id)).orderBy(asc(schema.budgetItems.createdAt));
  const sum = (list: typeof items, k: "planned" | "actual") => list.reduce((s, i) => s + (i[k] ?? 0), 0);

  return (
    <>
      <BackLink href={`/cuoi/${id}/them`}>Thêm</BackLink>
      <PageTitle title="Ngân sách" sub={`Dự kiến ${formatVnd(sum(items, "planned"))} · đã chi ${formatVnd(sum(items, "actual"))}`} />
      {items.length === 0 ? <Empty title="Chưa có khoản chi nào">Ghi các khoản lớn trước: tiệc, ảnh cưới, tráp ăn hỏi, nhẫn, trang phục.</Empty> : null}
      {SIDES.map((side) => {
        const list = items.filter((i) => i.payer === side);
        if (!list.length) return null;
        return (
          <section key={side}>
            <SectionTitle action={<span className="text-[0.88rem] text-muted tabular-nums">{formatVnd(sum(list, "planned"))}</span>}>
              {SIDE_LABEL[side]} chi
            </SectionTitle>
            <ul className="panel rows">
              {list.map((i) => (
                <li key={i.id} className="px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-medium">{i.title}</span>
                    <span className="text-[0.9rem] text-muted tabular-nums">dự kiến {formatVnd(i.planned)}</span>
                  </div>
                  <form action={updateBudgetActualAction.bind(null, id, i.id)} className="mt-2 flex gap-2">
                    <input
                      name="actual"
                      inputMode="numeric"
                      defaultValue={i.actual ?? ""}
                      placeholder="Đã chi thực tế"
                      className="field py-2"
                      aria-label={`Đã chi cho ${i.title}`}
                    />
                    <button className="btn-quiet btn-sm">Lưu</button>
                    <button formAction={deleteBudgetItemAction.bind(null, id, i.id)} className="btn-sm px-2 text-[0.85rem] font-medium text-son" aria-label={`Xoá ${i.title}`}>
                      Xoá
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      <SectionTitle>Thêm khoản chi</SectionTitle>
      <AddBudgetForm weddingId={id} />
    </>
  );
}

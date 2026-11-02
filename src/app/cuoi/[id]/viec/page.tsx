import type { Metadata } from "next";
import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getWeddingAccess } from "@/lib/access";
import { PageTitle, SectionTitle } from "@/components/ui";
import { CEREMONY_LABEL } from "@/lib/rituals";
import { CEREMONIES } from "@/lib/db/schema";
import { formatDateVn, todayVn } from "@/lib/dates";
import { toggleTaskAction, assignTaskAction, deleteTaskAction } from "@/app/actions/plan";
import { AddTaskForm } from "./add-task-form";

export const metadata: Metadata = { title: "Việc cần làm" };

const GROUPS = ["CHUNG", ...CEREMONIES] as const;
const GROUP_LABEL = { CHUNG: "Việc chung", ...CEREMONY_LABEL };

export default async function TasksPage({ params, searchParams }: PageProps<"/cuoi/[id]/viec">) {
  const { id } = await params;
  const sp = await searchParams;
  const { member } = await getWeddingAccess(id);
  const helper = member.role === "HELPER";
  const showDone = sp.xong === "1";
  const tasks = await db
    .select()
    .from(schema.tasks)
    .where(helper ? and(eq(schema.tasks.weddingId, id), eq(schema.tasks.assigneeMemberId, member.id)) : eq(schema.tasks.weddingId, id))
    .orderBy(asc(schema.tasks.dueDate));
  const members = await db.select().from(schema.members).where(eq(schema.members.weddingId, id));
  const nameOf = (mid: string | null) => members.find((m) => m.id === mid)?.displayName;
  const today = todayVn();
  const visible = tasks.filter((t) => showDone || !t.done);
  const doneCount = tasks.filter((t) => t.done).length;

  return (
    <>
      <PageTitle
        title={helper ? "Việc của bạn" : "Việc cần làm"}
        sub={`Xong ${doneCount}/${tasks.length}`}
        action={
          <a href={showDone ? "?" : "?xong=1"} className="btn-quiet btn-sm">
            {showDone ? "Ẩn việc xong" : "Hiện việc xong"}
          </a>
        }
      />
      {GROUPS.map((g) => {
        const list = visible.filter((t) => t.ceremony === g);
        if (!list.length) return null;
        return (
          <section key={g}>
            <SectionTitle>{GROUP_LABEL[g]}</SectionTitle>
            <ul className="panel rows">
              {list.map((t) => {
                const late = !t.done && t.dueDate && t.dueDate < today;
                return (
                  <li key={t.id} id={t.id} className="scroll-mt-20 px-3 py-2.5">
                    <div className="flex items-start gap-2">
                      <form action={toggleTaskAction.bind(null, id, t.id)}>
                        <button
                          aria-label={t.done ? `Bỏ đánh dấu xong: ${t.title}` : `Đánh dấu xong: ${t.title}`}
                          className={`mt-0.5 flex h-11 w-11 items-center justify-center rounded-full`}
                        >
                          <span className={`flex h-6 w-6 items-center justify-center rounded-md border-2 ${t.done ? "border-moss bg-moss" : "border-muted/60"}`}>
                            {t.done ? (
                              <svg aria-hidden width="14" height="14" viewBox="0 0 24 24">
                                <path d="M5 12l5 5 9-10" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            ) : null}
                          </span>
                        </button>
                      </form>
                      <div className="min-w-0 flex-1 py-2">
                        <div className={t.done ? "text-muted line-through" : "font-medium"}>{t.title}</div>
                        <div className={`text-[0.85rem] ${late ? "font-medium text-son" : "text-muted"}`}>
                          {t.dueDate ? `${late ? "Quá hạn · " : "Hạn "}${formatDateVn(t.dueDate)}` : "Chưa đặt hạn"}
                          {nameOf(t.assigneeMemberId) ? ` · ${nameOf(t.assigneeMemberId)}` : ""}
                        </div>
                        {!helper ? (
                          <details className="mt-1.5">
                            <summary className="cursor-pointer text-[0.85rem] font-medium text-son">Giao việc, đổi hạn</summary>
                            <form action={assignTaskAction.bind(null, id, t.id)} className="mt-2 space-y-2">
                              <select name="assignee" defaultValue={t.assigneeMemberId ?? ""} className="field" aria-label="Người phụ trách">
                                <option value="">Chưa giao</option>
                                {members.map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.displayName}
                                  </option>
                                ))}
                              </select>
                              <input type="date" name="dueDate" defaultValue={t.dueDate ?? ""} className="field" aria-label="Hạn" />
                              <div className="flex gap-2">
                                <button className="btn-primary btn-sm flex-1">Lưu</button>
                                <button formAction={deleteTaskAction.bind(null, id, t.id)} className="btn-quiet btn-sm">
                                  Xoá việc
                                </button>
                              </div>
                            </form>
                          </details>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      {visible.length === 0 ? <p className="mt-4 text-muted">{helper ? "Chưa có việc nào được giao cho bạn." : "Không còn việc nào chưa xong."}</p> : null}
      {!helper ? (
        <>
          <SectionTitle>Thêm việc</SectionTitle>
          <AddTaskForm weddingId={id} members={members.map((m) => ({ id: m.id, name: m.displayName }))} />
        </>
      ) : null}
    </>
  );
}

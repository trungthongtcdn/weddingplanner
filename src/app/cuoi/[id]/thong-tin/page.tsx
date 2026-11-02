import type { Metadata } from "next";
import { getWeddingAccess } from "@/lib/access";
import { PageTitle, BackLink } from "@/components/ui";
import { EditWeddingForm } from "./edit-form";

export const metadata: Metadata = { title: "Thông tin đám cưới" };

export default async function InfoPage({ params }: PageProps<"/cuoi/[id]/thong-tin">) {
  const { id } = await params;
  const { wedding } = await getWeddingAccess(id);
  return (
    <>
      <BackLink href={`/cuoi/${id}/them`}>Thêm</BackLink>
      <PageTitle title="Thông tin đám cưới" />
      <EditWeddingForm weddingId={id} wedding={wedding} />
    </>
  );
}

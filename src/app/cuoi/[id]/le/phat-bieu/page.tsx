import type { Metadata } from "next";
import { getWeddingAccess } from "@/lib/access";
import { BackLink, PageTitle } from "@/components/ui";
import { CEREMONY_LABEL, speechTemplate } from "@/lib/rituals";
import { CEREMONIES, type Ceremony } from "@/lib/db/schema";
import { aiEnabled } from "@/lib/ai";
import { SpeechEditor } from "./speech-editor";

export const metadata: Metadata = { title: "Bài phát biểu" };

export default async function SpeechPage({ params, searchParams }: PageProps<"/cuoi/[id]/le/phat-bieu">) {
  const { id } = await params;
  const sp = await searchParams;
  const { wedding } = await getWeddingAccess(id);
  const ceremony = (CEREMONIES as readonly string[]).includes(String(sp.le)) ? (sp.le as Ceremony) : "AN_HOI";
  const side = sp.ben === "NHA_GAI" ? "NHA_GAI" : "NHA_TRAI";
  const text = speechTemplate({ ceremony, side, groomName: wedding.groomName, brideName: wedding.brideName });
  return (
    <>
      <BackLink href={`/cuoi/${id}/le?le=${ceremony}`}>{CEREMONY_LABEL[ceremony]}</BackLink>
      <PageTitle title="Bài phát biểu" sub={`${CEREMONY_LABEL[ceremony]} · đại diện ${side === "NHA_TRAI" ? "nhà trai" : "nhà gái"}`} />
      <SpeechEditor weddingId={id} ceremony={ceremony} side={side} initialText={text} aiOn={aiEnabled()} />
    </>
  );
}

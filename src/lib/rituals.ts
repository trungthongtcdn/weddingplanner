import type { Ceremony, Region } from "./db/schema";

/**
 * NỘI DUNG MẪU về nghi lễ cưới hỏi truyền thống.
 *
 * Theo PRD, nội dung phong tục phải do chuyên gia hoặc wedding planner biên soạn và duyệt
 * trước khi ra mắt. Bộ dưới đây là bản nháp dùng cho giai đoạn thử nghiệm, viết ở mức khái quát
 * và luôn được hiển thị kèm nhãn "nội dung mẫu, đang chờ duyệt".
 */
export const RITUAL_CONTENT_STATUS: "draft" | "approved" = "draft";

export const REGION_LABEL: Record<Region, string> = {
  BAC: "Miền Bắc",
  TRUNG: "Miền Trung",
  NAM: "Miền Nam",
};

export const CEREMONY_LABEL: Record<Ceremony, string> = {
  DAM_NGO: "Dạm ngõ",
  AN_HOI: "Ăn hỏi",
  LE_CUOI: "Lễ cưới",
  LAI_MAT: "Lại mặt",
};

export type CeremonyGuide = {
  key: Ceremony;
  /** Lễ diễn ra ở nhà bên nào. */
  host: "NHA_GAI" | "NHA_TRAI";
  when: string;
  meaning: string;
  participants: string;
  offerings: Record<Region, string[]>;
  offeringNote?: Partial<Record<Region, string>>;
  steps: Record<Region, string[]>;
};

const sameForAll = <T,>(v: T): Record<Region, T> => ({ BAC: v, TRUNG: v, NAM: v });

export const CEREMONIES_GUIDE: CeremonyGuide[] = [
  {
    key: "DAM_NGO",
    host: "NHA_GAI",
    when: "Thường vài tháng trước lễ cưới, tùy hai gia đình thống nhất.",
    meaning: "Buổi gặp mặt chính thức đầu tiên của hai gia đình: nhà trai sang nhà gái ngỏ ý để đôi trẻ tiến tới hôn nhân.",
    participants: "Bố mẹ chú rể (có thể thêm người đại diện họ), chú rể; bên nhà gái là bố mẹ và người thân gần.",
    offerings: sameForAll(["Trầu cau", "Chè hoặc trà", "Rượu", "Bánh kẹo, hoa quả"]),
    offeringNote: sameForAll("Lễ dạm ngõ thường giản dị; giá trị nằm ở ý nghĩa ra mắt."),
    steps: sameForAll([
      "Nhà trai đến nhà gái đúng giờ đã hẹn, trao lễ.",
      "Đại diện nhà trai giới thiệu thành phần và ngỏ ý.",
      "Nhà gái nhận lễ, đặt lên bàn thờ gia tiên và thắp hương.",
      "Hai gia đình trò chuyện, bàn sơ bộ về ngày ăn hỏi và ngày cưới.",
    ]),
  },
  {
    key: "AN_HOI",
    host: "NHA_GAI",
    when: "Thường vài tuần đến vài tháng trước lễ cưới; một số gia đình tổ chức gần ngày cưới cho thuận tiện.",
    meaning: "Lễ đính hôn chính thức: nhà trai mang lễ vật sang nhà gái, hai bên xác nhận hôn ước.",
    participants: "Đại diện họ nhà trai, bố mẹ, chú rể, đội bê tráp; nhà gái có đại diện họ, bố mẹ, cô dâu, đội đỡ tráp.",
    offerings: {
      BAC: ["Trầu cau", "Chè, rượu", "Bánh cốm", "Bánh phu thê (xu xê)", "Mứt sen", "Hoa quả", "Lễ đen (tiền dẫn cưới)"],
      TRUNG: ["Trầu cau", "Chè, rượu", "Bánh phu thê", "Hoa quả", "Lễ đen (tiền dẫn cưới)"],
      NAM: ["Trầu cau", "Rượu, trà", "Bánh phu thê (su sê)", "Heo quay", "Xôi gấc", "Trái cây", "Đèn cầy long phụng", "Nữ trang cho cô dâu", "Lễ đen"],
    },
    offeringNote: {
      BAC: "Số tráp thường là số lẻ (5, 7, 9 hoặc 11).",
      TRUNG: "Lễ thường giản dị hơn; số mâm tùy gia đình.",
      NAM: "Số mâm quả thường là số chẵn.",
    },
    steps: {
      BAC: [
        "Đội bê tráp nhà trai xếp hàng trước cổng nhà gái.",
        "Trao tráp: đội bê tráp trao lễ cho đội đỡ tráp nhà gái.",
        "Đại diện nhà trai giới thiệu và nói lý do; đại diện nhà gái đáp lời, nhận lễ.",
        "Nhà gái mở tráp, đặt lễ lên bàn thờ gia tiên; cô dâu ra mắt hai họ.",
        "Cô dâu chú rể thắp hương bàn thờ gia tiên nhà gái.",
        "Nhà gái lại quả một phần lễ cho nhà trai và tiễn khách.",
      ],
      TRUNG: [
        "Nhà trai đến nhà gái, trao lễ.",
        "Đại diện hai họ phát biểu, nhà gái nhận lễ.",
        "Đặt lễ lên bàn thờ gia tiên, cô dâu chú rể thắp hương.",
        "Nhà gái lại quả và tiễn khách.",
      ],
      NAM: [
        "Đội bưng mâm quả nhà trai trao mâm cho nhà gái.",
        "Đại diện nhà trai giới thiệu và xin làm lễ; nhà gái đáp lời, nhận lễ.",
        "Mở mâm quả, đặt lễ lên bàn thờ gia tiên.",
        "Cô dâu chú rể thắp hương; mẹ chú rể trao nữ trang cho cô dâu.",
        "Nhà gái lại quả và tiễn khách.",
      ],
    },
  },
  {
    key: "LE_CUOI",
    host: "NHA_TRAI",
    when: "Ngày cưới đã chọn; giờ đón dâu do hai gia đình thống nhất.",
    meaning: "Nhà trai đón cô dâu về nhà chồng, làm lễ gia tiên ở cả hai nhà, sau đó đãi tiệc.",
    participants: "Đoàn đón dâu nhà trai, đại diện họ hai bên, cô dâu chú rể, phù dâu phù rể.",
    offerings: {
      BAC: ["Trầu cau", "Rượu", "Hương, hoa cho lễ gia tiên"],
      TRUNG: ["Trầu cau", "Rượu", "Hương, hoa cho lễ gia tiên"],
      NAM: ["Trầu cau", "Rượu", "Đèn cầy long phụng", "Hương, hoa cho lễ gia tiên"],
    },
    offeringNote: {
      BAC: "Trước giờ đón dâu thường có người đại diện nhà trai mang trầu, rượu sang xin dâu.",
      NAM: "Tại nhà trai thường có nghi thức thắp đèn long phụng (lễ lên đèn).",
    },
    steps: {
      BAC: [
        "Lễ xin dâu: người đại diện nhà trai đến trước, mang trầu rượu sang xin dâu.",
        "Đoàn nhà trai vào nhà gái, đại diện hai họ phát biểu.",
        "Cô dâu chú rể làm lễ gia tiên nhà gái.",
        "Rước dâu về nhà trai.",
        "Làm lễ gia tiên nhà trai, ra mắt họ hàng.",
        "Tiệc cưới.",
      ],
      TRUNG: [
        "Đoàn nhà trai đến nhà gái, đại diện hai họ phát biểu.",
        "Cô dâu chú rể làm lễ gia tiên nhà gái.",
        "Rước dâu về nhà trai, làm lễ gia tiên nhà trai.",
        "Tiệc cưới.",
      ],
      NAM: [
        "Đoàn nhà trai đến, trao mâm lễ rước dâu.",
        "Lễ vu quy tại nhà gái: làm lễ gia tiên, hai bên gia đình trao quà và nữ trang.",
        "Rước dâu về nhà trai.",
        "Lễ thành hôn tại nhà trai: lễ gia tiên, thắp đèn long phụng.",
        "Tiệc cưới.",
      ],
    },
  },
  {
    key: "LAI_MAT",
    host: "NHA_GAI",
    when: "Thường vài ngày sau lễ cưới, tùy gia đình.",
    meaning: "Vợ chồng mới cưới về thăm nhà gái, thể hiện lòng biết ơn với bố mẹ vợ.",
    participants: "Cô dâu, chú rể; có thể có bố mẹ chú rể.",
    offerings: sameForAll(["Trầu cau", "Rượu", "Bánh trái, quà biếu"]),
    steps: sameForAll([
      "Vợ chồng mang lễ về nhà gái.",
      "Thắp hương bàn thờ gia tiên nhà gái.",
      "Dùng bữa cùng gia đình.",
    ]),
  },
];

/** Các điểm thường khác nhau giữa phong tục hai vùng — gia đình chốt từng điểm. */
export type CustomDifference = {
  key: string;
  ceremony: Ceremony;
  title: string;
  byRegion: Record<Region, string>;
};

export const CUSTOM_DIFFERENCES: CustomDifference[] = [
  {
    key: "so-trap",
    ceremony: "AN_HOI",
    title: "Số tráp / mâm quả ăn hỏi",
    byRegion: {
      BAC: "Số lẻ: 5, 7, 9 hoặc 11 tráp.",
      TRUNG: "Tùy gia đình, thường giản dị.",
      NAM: "Thường là số chẵn.",
    },
  },
  {
    key: "le-vat-an-hoi",
    ceremony: "AN_HOI",
    title: "Lễ vật đặc trưng khi ăn hỏi",
    byRegion: {
      BAC: "Bánh cốm, bánh phu thê, mứt sen, chè, rượu.",
      TRUNG: "Trầu cau, rượu, chè, bánh phu thê, hoa quả.",
      NAM: "Heo quay, xôi gấc, bánh phu thê, đèn cầy long phụng, nữ trang.",
    },
  },
  {
    key: "trao-nu-trang",
    ceremony: "AN_HOI",
    title: "Trao nữ trang cho cô dâu",
    byRegion: {
      BAC: "Không phải nghi thức bắt buộc; nhiều gia đình trao trong ngày cưới.",
      TRUNG: "Tùy gia đình.",
      NAM: "Mẹ chú rể trao nữ trang cho cô dâu ngay trong lễ.",
    },
  },
  {
    key: "truoc-ruoc-dau",
    ceremony: "LE_CUOI",
    title: "Nghi thức trước khi rước dâu",
    byRegion: {
      BAC: "Lễ xin dâu: người đại diện nhà trai sang trước, mang trầu rượu.",
      TRUNG: "Đại diện hai họ phát biểu tại nhà gái rồi làm lễ gia tiên.",
      NAM: "Lễ vu quy tại nhà gái, trao quà và nữ trang.",
    },
  },
  {
    key: "len-den",
    ceremony: "LE_CUOI",
    title: "Thắp đèn long phụng tại nhà trai",
    byRegion: {
      BAC: "Thường không có.",
      TRUNG: "Tùy gia đình.",
      NAM: "Có, là một phần của lễ thành hôn.",
    },
  },
];

export function differencesBetween(groom: Region, bride: Region): CustomDifference[] {
  if (groom === bride) return [];
  return CUSTOM_DIFFERENCES.filter((d) => d.byRegion[groom] !== d.byRegion[bride]);
}

/* ----------------------------------------------------------------------------
 * Checklist mẫu — ngày tính tương đối so với ngày cưới (âm = trước, dương = sau).
 * ------------------------------------------------------------------------- */

export type TaskTemplate = { key: string; ceremony: Ceremony | "CHUNG"; title: string; offsetDays: number };

export const TASK_TEMPLATES: TaskTemplate[] = [
  { key: "chot-ngay", ceremony: "CHUNG", title: "Hai gia đình thống nhất ngày ăn hỏi và ngày cưới", offsetDays: -150 },
  { key: "dam-ngo-le", ceremony: "DAM_NGO", title: "Chuẩn bị lễ dạm ngõ: trầu cau, chè, rượu, bánh kẹo", offsetDays: -140 },
  { key: "dat-nha-hang", ceremony: "LE_CUOI", title: "Đặt nhà hàng hoặc địa điểm tiệc", offsetDays: -120 },
  { key: "chup-anh", ceremony: "LE_CUOI", title: "Chọn studio và chụp ảnh cưới", offsetDays: -75 },
  { key: "danh-sach-khach", ceremony: "LE_CUOI", title: "Lập danh sách khách mời (cả khách của bố mẹ)", offsetDays: -60 },
  { key: "dat-trap", ceremony: "AN_HOI", title: "Đặt tráp / mâm quả ăn hỏi", offsetDays: -45 },
  { key: "doi-trap", ceremony: "AN_HOI", title: "Chọn đội bê tráp nhà trai và đội đỡ tráp nhà gái", offsetDays: -40 },
  { key: "ao-dai-trap", ceremony: "AN_HOI", title: "Chuẩn bị áo dài cho đội bê tráp, đỡ tráp", offsetDays: -30 },
  { key: "nhan-cuoi", ceremony: "LE_CUOI", title: "Chuẩn bị nhẫn cưới", offsetDays: -30 },
  { key: "dai-dien", ceremony: "LE_CUOI", title: "Mời người đại diện phát biểu cho mỗi họ", offsetDays: -30 },
  { key: "xe-don-dau", ceremony: "LE_CUOI", title: "Đặt xe đón dâu", offsetDays: -30 },
  { key: "goi-moi", ceremony: "LE_CUOI", title: "Gọi điện mời và gửi thiệp", offsetDays: -21 },
  { key: "dang-ky-ket-hon", ceremony: "CHUNG", title: "Đăng ký kết hôn tại UBND nơi cư trú", offsetDays: -14 },
  { key: "le-den", ceremony: "AN_HOI", title: "Chuẩn bị lễ đen", offsetDays: -14 },
  { key: "bao-mam", ceremony: "LE_CUOI", title: "Báo số mâm/bàn chính thức với nhà hàng", offsetDays: -5 },
  { key: "phong-bi-trap", ceremony: "AN_HOI", title: "Chuẩn bị phong bì cảm ơn đội bê tráp", offsetDays: -3 },
  { key: "ban-tho", ceremony: "LE_CUOI", title: "Chuẩn bị bàn thờ gia tiên: hương, hoa, trầu rượu", offsetDays: -2 },
  { key: "le-lai-mat", ceremony: "LAI_MAT", title: "Chuẩn bị lễ lại mặt", offsetDays: 2 },
  { key: "cam-on-khach", ceremony: "CHUNG", title: "Cảm ơn khách và tổng kết sổ mừng", offsetDays: 7 },
];

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

/* ----------------------------------------------------------------------------
 * Bài phát biểu mẫu
 * ------------------------------------------------------------------------- */

export type SpeechInput = {
  ceremony: Ceremony;
  side: "NHA_TRAI" | "NHA_GAI";
  groomName: string;
  brideName: string;
  speakerTitle?: string;
};

export function speechTemplate(i: SpeechInput): string {
  const speaker = i.speakerTitle?.trim() || (i.side === "NHA_TRAI" ? "đại diện họ nhà trai" : "đại diện họ nhà gái");
  const groom = i.groomName;
  const bride = i.brideName;
  if (i.ceremony === "AN_HOI" && i.side === "NHA_TRAI") {
    return `Kính thưa hai bên gia đình, thưa toàn thể quý vị.

Tôi xin tự giới thiệu, tôi là ${speaker}. Hôm nay là ngày lành, gia đình chúng tôi sang đây trước là để thăm hỏi sức khỏe ông bà, các cụ và toàn thể gia đình, sau là có chút lễ mọn để làm lễ ăn hỏi cho cháu ${groom} và cháu ${bride}.

Được sự đồng ý của hai bên gia đình, hai cháu đã tìm hiểu và quyết định tiến tới hôn nhân. Thay mặt gia đình nhà trai, chúng tôi kính mong gia đình nhà gái nhận lễ, để các cháu được thắp hương báo cáo tổ tiên.

Xin trân trọng cảm ơn.`;
  }
  if (i.ceremony === "AN_HOI" && i.side === "NHA_GAI") {
    return `Kính thưa gia đình nhà trai, thưa toàn thể quý vị.

Tôi là ${speaker}. Thay mặt gia đình nhà gái, chúng tôi xin cảm ơn gia đình nhà trai đã sang thăm và mang lễ đến hôm nay.

Gia đình chúng tôi rất vui mừng khi cháu ${bride} và cháu ${groom} đã tìm hiểu và quyết định gắn bó với nhau. Chúng tôi xin nhận lễ và cho phép các cháu thắp hương báo cáo tổ tiên. Mong rằng từ nay hai gia đình sẽ thêm gắn bó, thương yêu nhau.

Xin trân trọng cảm ơn.`;
  }
  if (i.ceremony === "LE_CUOI" && i.side === "NHA_TRAI") {
    return `Kính thưa hai bên gia đình, thưa toàn thể quý vị.

Tôi là ${speaker}. Hôm nay là ngày lành tháng tốt, gia đình nhà trai chúng tôi sang đây để xin phép gia đình nhà gái cho cháu ${groom} được đón cháu ${bride} về làm dâu.

Chúng tôi xin hứa sẽ yêu thương, đùm bọc cháu ${bride} như con cháu trong nhà. Kính mong gia đình nhà gái cho phép các cháu làm lễ gia tiên và đón dâu đúng giờ.

Xin trân trọng cảm ơn.`;
  }
  if (i.ceremony === "LE_CUOI" && i.side === "NHA_GAI") {
    return `Kính thưa gia đình nhà trai, thưa toàn thể quý vị.

Tôi là ${speaker}. Thay mặt gia đình nhà gái, chúng tôi xin cảm ơn gia đình nhà trai đã đến đúng ngày giờ.

Hôm nay cháu ${bride} chính thức về làm dâu gia đình nhà trai. Gia đình chúng tôi gửi gắm cháu và mong cháu sẽ cùng cháu ${groom} xây dựng một gia đình hạnh phúc, hiếu thảo với hai bên nội ngoại.

Xin trân trọng cảm ơn.`;
  }
  if (i.ceremony === "DAM_NGO") {
    return `Kính thưa gia đình, tôi là ${speaker}. Hôm nay gia đình chúng tôi sang thăm hỏi và ngỏ ý để cháu ${groom} và cháu ${bride} được chính thức tìm hiểu, tiến tới hôn nhân. Kính mong gia đình chấp thuận để hai bên cùng bàn chuyện ăn hỏi và cưới cho các cháu.`;
  }
  return `Kính thưa gia đình, tôi là ${speaker}. Hôm nay vợ chồng cháu ${groom} và ${bride} về thăm và cảm ơn bố mẹ, cảm ơn gia đình đã lo chu toàn lễ cưới cho các cháu.`;
}

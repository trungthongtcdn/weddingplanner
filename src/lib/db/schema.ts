import { sqliteTable, text, integer, primaryKey, index, uniqueIndex } from "drizzle-orm/sqlite-core";

/* ----------------------------------------------------------------------------
 * Giá trị liệt kê
 * ------------------------------------------------------------------------- */

export const REGIONS = ["BAC", "TRUNG", "NAM"] as const;
export type Region = (typeof REGIONS)[number];

/** Vai trò của thành viên trong một đám cưới. */
export const MEMBER_ROLES = ["COUPLE", "PARENT_GROOM", "PARENT_BRIDE", "HELPER"] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

/** Danh sách khách / quỹ mừng thuộc về bên nào. */
export const SIDES = ["CAP_DOI", "NHA_TRAI", "NHA_GAI"] as const;
export type Side = (typeof SIDES)[number];

export const GUEST_STATUSES = ["CHUA_MOI", "DA_GOI", "DA_GUI_THIEP", "DA_MO", "CO_MAT", "DA_MUNG"] as const;
export type GuestStatus = (typeof GUEST_STATUSES)[number];

export const CALL_RESULTS = ["SE_DI", "CHUA_CHAC", "KHONG_DI", "KHONG_NGHE"] as const;
export type CallResult = (typeof CALL_RESULTS)[number];

export const CEREMONIES = ["DAM_NGO", "AN_HOI", "LE_CUOI", "LAI_MAT"] as const;
export type Ceremony = (typeof CEREMONIES)[number];

export const GIFT_METHODS = ["CHUYEN_KHOAN", "PHONG_BI", "HIEN_VAT"] as const;
export type GiftMethod = (typeof GIFT_METHODS)[number];

export const MATCH_STATUSES = ["AUTO_CODE", "AUTO_NAME", "MANUAL", "UNMATCHED", "UNKNOWN"] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

/* ----------------------------------------------------------------------------
 * Tài khoản và đăng nhập
 * ------------------------------------------------------------------------- */

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  phone: text("phone").notNull().unique(),
  name: text("name"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const otpCodes = sqliteTable(
  "otp_codes",
  {
    id: text("id").primaryKey(),
    phone: text("phone").notNull(),
    codeHash: text("code_hash").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    attempts: integer("attempts").notNull().default(0),
    consumedAt: integer("consumed_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [index("otp_phone_idx").on(t.phone)],
);

export const sessions = sqliteTable("sessions", {
  /** sha256 của token trong cookie — token gốc không được lưu. */
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

/* ----------------------------------------------------------------------------
 * Đám cưới và thành viên
 * ------------------------------------------------------------------------- */

export const weddings = sqliteTable("weddings", {
  id: text("id").primaryKey(),
  groomName: text("groom_name").notNull(),
  brideName: text("bride_name").notNull(),
  groomRegion: text("groom_region").$type<Region>().notNull(),
  brideRegion: text("bride_region").$type<Region>().notNull(),
  groomProvince: text("groom_province"),
  brideProvince: text("bride_province"),
  /** Ngày cưới (YYYY-MM-DD, dương lịch). */
  weddingDate: text("wedding_date").notNull(),
  groomBirthYear: integer("groom_birth_year"),
  brideBirthYear: integer("bride_birth_year"),
  /** Lời mời gửi kèm link thiệp; {ten} được thay bằng tên khách. */
  inviteMessage: text("invite_message"),
  /** Cho phép hiện mục "Gửi lời chúc" có QR mừng trên trang thiệp. */
  giftQrEnabled: integer("gift_qr_enabled", { mode: "boolean" }).notNull().default(true),
  createdBy: text("created_by").notNull().references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const members = sqliteTable(
  "members",
  {
    id: text("id").primaryKey(),
    weddingId: text("wedding_id").notNull().references(() => weddings.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: text("role").$type<MemberRole>().notNull(),
    displayName: text("display_name").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [uniqueIndex("member_wedding_user_idx").on(t.weddingId, t.userId)],
);

export const memberInvites = sqliteTable("member_invites", {
  id: text("id").primaryKey(),
  weddingId: text("wedding_id").notNull().references(() => weddings.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  role: text("role").$type<MemberRole>().notNull(),
  label: text("label").notNull(),
  createdBy: text("created_by").notNull().references(() => members.id, { onDelete: "cascade" }),
  usedBy: text("used_by").references(() => users.id),
  usedAt: integer("used_at", { mode: "timestamp_ms" }),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

/** Tiệc / buổi lễ khách được mời tới (tiệc nhà gái, nhà trai, tiệc bạn bè…). */
export const parties = sqliteTable("parties", {
  id: text("id").primaryKey(),
  weddingId: text("wedding_id").notNull().references(() => weddings.id, { onDelete: "cascade" }),
  side: text("side").$type<Side>().notNull(),
  name: text("name").notNull(),
  /** Ngày giờ địa phương, dạng YYYY-MM-DDTHH:mm. */
  startsAt: text("starts_at").notNull(),
  venue: text("venue"),
  address: text("address"),
  /** Số khách mỗi mâm/bàn, dùng để ước lượng. */
  seatsPerTable: integer("seats_per_table").notNull().default(10),
  sortOrder: integer("sort_order").notNull().default(0),
});

/* ----------------------------------------------------------------------------
 * Kế hoạch lễ
 * ------------------------------------------------------------------------- */

/** Lựa chọn của gia đình cho từng điểm khác biệt phong tục giữa hai vùng. */
export const decisions = sqliteTable(
  "decisions",
  {
    id: text("id").primaryKey(),
    weddingId: text("wedding_id").notNull().references(() => weddings.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    choice: text("choice").$type<"GROOM" | "BRIDE" | "CUSTOM">().notNull(),
    note: text("note"),
    confirmed: integer("confirmed", { mode: "boolean" }).notNull().default(false),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [uniqueIndex("decision_wedding_key_idx").on(t.weddingId, t.key)],
);

export const tasks = sqliteTable(
  "tasks",
  {
    id: text("id").primaryKey(),
    weddingId: text("wedding_id").notNull().references(() => weddings.id, { onDelete: "cascade" }),
    ceremony: text("ceremony").$type<Ceremony | "CHUNG">().notNull(),
    title: text("title").notNull(),
    dueDate: text("due_date"),
    assigneeMemberId: text("assignee_member_id").references(() => members.id, { onDelete: "set null" }),
    done: integer("done", { mode: "boolean" }).notNull().default(false),
    templateKey: text("template_key"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [index("task_wedding_idx").on(t.weddingId)],
);

export const budgetItems = sqliteTable("budget_items", {
  id: text("id").primaryKey(),
  weddingId: text("wedding_id").notNull().references(() => weddings.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  payer: text("payer").$type<Side>().notNull(),
  planned: integer("planned").notNull().default(0),
  actual: integer("actual"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

/* ----------------------------------------------------------------------------
 * Khách mời
 * ------------------------------------------------------------------------- */

export const guests = sqliteTable(
  "guests",
  {
    id: text("id").primaryKey(),
    weddingId: text("wedding_id").notNull().references(() => weddings.id, { onDelete: "cascade" }),
    /** Danh sách của bên nào — quyết định quỹ nhận mừng. */
    side: text("side").$type<Side>().notNull(),
    createdByMemberId: text("created_by_member_id").references(() => members.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    /** Cách xưng hô trên thiệp: "chú", "cô", "anh", "bạn"… */
    honorific: text("honorific"),
    phone: text("phone"),
    groupName: text("group_name"),
    note: text("note"),
    status: text("status").$type<GuestStatus>().notNull().default("CHUA_MOI"),
    callResult: text("call_result").$type<CallResult>(),
    inviteToken: text("invite_token").notNull().unique(),
    /** Mã ngắn ghi trong nội dung chuyển khoản để đối soát. */
    giftCode: text("gift_code").notNull(),
    openedAt: integer("opened_at", { mode: "timestamp_ms" }),
    sentAt: integer("sent_at", { mode: "timestamp_ms" }),
    remindOptIn: integer("remind_opt_in", { mode: "boolean" }).notNull().default(false),
    thankedAt: integer("thanked_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    index("guest_wedding_idx").on(t.weddingId),
    uniqueIndex("guest_wedding_code_idx").on(t.weddingId, t.giftCode),
  ],
);

export const guestParties = sqliteTable(
  "guest_parties",
  {
    guestId: text("guest_id").notNull().references(() => guests.id, { onDelete: "cascade" }),
    partyId: text("party_id").notNull().references(() => parties.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.guestId, t.partyId] })],
);

/* ----------------------------------------------------------------------------
 * Sổ mừng
 * ------------------------------------------------------------------------- */

export const funds = sqliteTable(
  "funds",
  {
    id: text("id").primaryKey(),
    weddingId: text("wedding_id").notNull().references(() => weddings.id, { onDelete: "cascade" }),
    side: text("side").$type<Side>().notNull(),
    /** Mã BIN ngân hàng theo chuẩn VietQR/NAPAS. */
    bankBin: text("bank_bin"),
    accountNumber: text("account_number"),
    accountName: text("account_name"),
    /** Quỹ của bố mẹ: có cho cặp đôi xem số tiền không (bố mẹ quyết). */
    coupleCanView: integer("couple_can_view", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [uniqueIndex("fund_wedding_side_idx").on(t.weddingId, t.side)],
);

export const gifts = sqliteTable(
  "gifts",
  {
    id: text("id").primaryKey(),
    weddingId: text("wedding_id").notNull().references(() => weddings.id, { onDelete: "cascade" }),
    fundId: text("fund_id").notNull().references(() => funds.id, { onDelete: "cascade" }),
    guestId: text("guest_id").references(() => guests.id, { onDelete: "set null" }),
    method: text("method").$type<GiftMethod>().notNull(),
    amount: integer("amount").notNull().default(0),
    itemDesc: text("item_desc"),
    note: text("note"),
    /** Dòng gốc: nội dung chuyển khoản hoặc câu đã nói khi nhập phong bì. */
    rawText: text("raw_text"),
    matchStatus: text("match_status").$type<MatchStatus>().notNull(),
    /** Dấu vân tay của dòng sao kê, để không nhập trùng. */
    txRef: text("tx_ref"),
    receivedAt: text("received_at"),
    createdByMemberId: text("created_by_member_id").references(() => members.id, { onDelete: "set null" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    index("gift_fund_idx").on(t.fundId),
    uniqueIndex("gift_fund_txref_idx").on(t.fundId, t.txRef),
  ],
);

/** Lịch sử chỉnh sửa khoản mừng. */
export const giftEdits = sqliteTable("gift_edits", {
  id: text("id").primaryKey(),
  giftId: text("gift_id").notNull().references(() => gifts.id, { onDelete: "cascade" }),
  memberId: text("member_id").references(() => members.id, { onDelete: "set null" }),
  summary: text("summary").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

/** Sổ đi: khoản người dùng đã mừng người khác (gắn với người dùng, không gắn đám cưới). */
export const outgoingGifts = sqliteTable(
  "outgoing_gifts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    personName: text("person_name").notNull(),
    phone: text("phone"),
    eventName: text("event_name").notNull(),
    eventDate: text("event_date"),
    amount: integer("amount").notNull().default(0),
    note: text("note"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [index("outgoing_user_idx").on(t.userId)],
);

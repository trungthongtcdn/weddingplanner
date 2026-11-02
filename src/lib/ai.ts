import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/**
 * Trợ lý AI (tuỳ chọn). Khi chưa có ANTHROPIC_API_KEY, các tính năng dùng mẫu soạn sẵn.
 * AI chỉ chỉnh câu chữ trên nền nội dung có sẵn — không tự đưa ra thông tin phong tục mới.
 */
export function aiEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  client ??= new Anthropic();
  return client;
}

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-haiku-5-5";

export async function aiRewrite(opts: { instruction: string; base: string; maxTokens?: number }): Promise<string | null> {
  if (!aiEnabled()) return null;
  try {
    const msg = await getClient().messages.create({
      model: MODEL,
      max_tokens: opts.maxTokens ?? 800,
      system:
        "Bạn giúp gia đình Việt Nam chuẩn bị đám cưới truyền thống. Viết tiếng Việt tự nhiên, lễ phép, ngắn gọn. " +
        "Chỉ chỉnh câu chữ của bản gốc theo yêu cầu; không thêm nghi thức, lễ vật hay con số không có trong bản gốc. " +
        "Chỉ trả về văn bản cuối cùng, không giải thích.",
      messages: [{ role: "user", content: `${opts.instruction}\n\nBản gốc:\n${opts.base}` }],
    });
    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    return text || null;
  } catch (e) {
    console.error("[ai] lỗi khi gọi Claude", e);
    return null;
  }
}

import { describe, expect, it } from "vitest";
import { detectMention, mentionRateByProvider, normalize } from "../src/diagnose/detect.js";
import type { AiAnswer } from "../src/providers/types.js";
import type { Target } from "../src/diagnose/target.js";

const target: Target = {
  name: "Barber Ｓｈｉｍｏ",
  aliases: ["バーバーしも"],
  area: "松江市",
  industry: "メンズサロン",
  website: "https://www.barber-shimo.example",
  notes: undefined,
};

function answer(text: string, citations: string[] = []): AiAnswer {
  return { provider: "ChatGPT", model: "test", query: "q", text, citations };
}

describe("normalize", () => {
  it("全角・空白・大文字小文字の揺れを吸収する", () => {
    expect(normalize("Barber　Ｓｈｉｍｏ")).toBe("barbershimo");
  });
});

describe("detectMention", () => {
  it("正式名称が含まれていれば検出する", () => {
    const r = detectMention(answer("おすすめは Barber Shimo です。"), target);
    expect(r.mentioned).toBe(true);
    expect(r.matchedAlias).toBe("Barber Ｓｈｉｍｏ");
  });

  it("別表記でも検出する", () => {
    const r = detectMention(answer("バーバーしも が人気です"), target);
    expect(r.mentioned).toBe(true);
    expect(r.matchedAlias).toBe("バーバーしも");
  });

  it("含まれていなければ未検出", () => {
    expect(detectMention(answer("A店とB店がおすすめです"), target).mentioned).toBe(false);
  });

  it("公式サイトの引用を検出する", () => {
    const r = detectMention(answer("…", ["https://barber-shimo.example/menu"]), target);
    expect(r.citedOfficialSite).toBe(true);
  });
});

describe("mentionRateByProvider", () => {
  it("プロバイダごとの推薦率を計算する", () => {
    const results = [
      detectMention(answer("Barber Shimo"), target),
      detectMention(answer("他店"), target),
      { ...detectMention(answer("バーバーしも"), target), provider: "Gemini" as const },
    ];
    expect(mentionRateByProvider(results)).toEqual({ ChatGPT: 0.5, Gemini: 1 });
  });
});

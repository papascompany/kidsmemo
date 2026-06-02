import { z } from "zod";
import type { EventAssistantRequest, ShoppingRecommendation } from "./types";

const naverShoppingItemSchema = z.object({
  title: z.string(),
  link: z.string().url().optional().or(z.literal("")),
  lprice: z.string().optional(),
  mallName: z.string().optional()
});

const naverShoppingResponseSchema = z.object({
  items: z.array(naverShoppingItemSchema).default([])
});

const NAVER_SHOPPING_ENDPOINT = "https://openapi.naver.com/v1/search/shop.json";

export async function searchEventShoppingRecommendations(
  input: EventAssistantRequest
): Promise<ShoppingRecommendation[]> {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return buildMockShoppingRecommendations(input);
  }

  try {
    const query = `${input.eventName} ${input.ageGroup} 행사용품`;
    const url = new URL(NAVER_SHOPPING_ENDPOINT);
    url.searchParams.set("query", query);
    url.searchParams.set("display", "5");
    url.searchParams.set("sort", "sim");

    const response = await fetch(url, {
      headers: {
        "X-Naver-Client-Id": clientId,
        "X-Naver-Client-Secret": clientSecret
      },
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) {
      return buildMockShoppingRecommendations(input);
    }

    const parsed = naverShoppingResponseSchema.safeParse(await response.json());

    if (!parsed.success || parsed.data.items.length === 0) {
      return buildMockShoppingRecommendations(input);
    }

    return parsed.data.items.slice(0, 3).map((item) => ({
      title: stripHtml(item.title),
      priceLabel: formatPriceLabel(item.lprice),
      mallName: item.mallName || "네이버 쇼핑",
      url: item.link || buildNaverShoppingSearchUrl(query),
      reason: `${input.eventName} 준비물로 검색된 상품입니다. 예산과 원 분위기에 맞는지 확인해 보세요.`
    }));
  } catch {
    return buildMockShoppingRecommendations(input);
  }
}

export function buildMockShoppingRecommendations(
  input: EventAssistantRequest
): ShoppingRecommendation[] {
  const budgetHint = input.budget || "중간 예산";

  return [
    {
      title: "행사용 스탬프 세트",
      priceLabel: `${budgetHint} 추천`,
      mallName: "네이버 쇼핑 검색",
      url: buildNaverShoppingSearchUrl("행사용 스탬프"),
      reason: "미션형 행사에서 아이들의 참여감을 높이기 좋습니다."
    },
    {
      title: "포토존 배경천",
      priceLabel: `${budgetHint} 추천`,
      mallName: "네이버 쇼핑 검색",
      url: buildNaverShoppingSearchUrl("포토존 배경천"),
      reason: "점보키즈 포토북/앨범 안내와 자연스럽게 연결됩니다."
    },
    {
      title: "어린이 이름표 스티커",
      priceLabel: `${budgetHint} 추천`,
      mallName: "네이버 쇼핑 검색",
      url: buildNaverShoppingSearchUrl("어린이 이름표 스티커"),
      reason: "행사 당일 안전 관리와 사진 분류에 도움이 됩니다."
    }
  ];
}

function formatPriceLabel(price?: string): string {
  const numericPrice = Number(price);

  if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
    return "가격 확인 필요";
  }

  return `${numericPrice.toLocaleString("ko-KR")}원부터`;
}

function buildNaverShoppingSearchUrl(query: string): string {
  return `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(query)}`;
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, "").replace(/&quot;/g, "\"").replace(/&amp;/g, "&").trim();
}

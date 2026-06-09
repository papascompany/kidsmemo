import { z } from "zod";
import type {
  EventAssistantRequest,
  EventAssistantResult,
  ParentMessageRequest,
  ParentMessageResult,
  ShoppingRecommendation
} from "./types";
import { searchEventShoppingRecommendations } from "./naver-shopping";
import { generateStructuredJson } from "./openai-client";

const nonEmptyStringSchema = z.string().trim().min(1);

export const shoppingRecommendationSchema = z.object({
  title: nonEmptyStringSchema,
  priceLabel: nonEmptyStringSchema,
  mallName: nonEmptyStringSchema,
  url: z.string().url(),
  reason: nonEmptyStringSchema
});

export const eventAssistantResultSchema = z.object({
  ideas: z.array(nonEmptyStringSchema).min(3).max(5),
  checklist: z.array(nonEmptyStringSchema).min(4).max(8),
  timeline: z.array(nonEmptyStringSchema).min(4).max(8),
  parentNoticeDraft: nonEmptyStringSchema,
  shoppingRecommendations: z.array(shoppingRecommendationSchema).min(1).max(5)
});

export const parentMessageResultSchema = z.object({
  candidates: z.array(nonEmptyStringSchema).min(3).max(3),
  safetyNotes: z.array(nonEmptyStringSchema).min(2).max(5)
});

export async function generateEventAssistantPlan(
  input: EventAssistantRequest
): Promise<EventAssistantResult> {
  const shoppingRecommendations = await searchEventShoppingRecommendations(input);
  const generated = await generateStructuredJson<EventAssistantResult>({
    name: "event_assistant",
    schema: eventAssistantResultSchema,
    system:
      "You create practical Korean event plans for daycare and kindergarten operators. Return only JSON that matches the requested shape. Keep recommendations safe, concrete, printable, and suitable for parents.",
    user: JSON.stringify({
      input,
      shoppingRecommendations,
      requiredShape: {
        ideas: "3-5 Korean strings",
        checklist: "4-8 Korean strings",
        timeline: "4-8 Korean strings with time labels where useful",
        parentNoticeDraft: "one polished Korean parent notice paragraph",
        shoppingRecommendations:
          "1-5 items using the provided shopping results when possible; include title, priceLabel, mallName, url, reason"
      }
    })
  });

  return generated ?? generateEventAssistantFallback(input, shoppingRecommendations);
}

export async function generateParentMessages(
  input: ParentMessageRequest
): Promise<ParentMessageResult> {
  const generated = await generateStructuredJson<ParentMessageResult>({
    name: "parent_message",
    schema: parentMessageResultSchema,
    system:
      "You write Korean messages from daycare and kindergarten directors to parents. Return only JSON. Avoid sensitive child data, exaggeration, purchase pressure, or claims that require proof.",
    user: JSON.stringify({
      input,
      requiredShape: {
        candidates: "exactly 3 polished Korean message candidates",
        safetyNotes: "2-5 Korean notes about privacy, tone, and final human review"
      }
    })
  });

  return generated ?? generateParentMessagesFallback(input);
}

function generateEventAssistantFallback(
  input: EventAssistantRequest,
  shoppingRecommendations: ShoppingRecommendation[]
): EventAssistantResult {
  return eventAssistantResultSchema.parse({
    ideas: [
      `${input.eventName} 포토존과 반별 미션 스탬프를 결합한 참여형 행사`,
      `${input.ageGroup} 아이들이 직접 꾸민 초대장을 활용한 가족 참여 코너`,
      `${input.season} 계절감을 살린 단체 사진 촬영 루틴과 추억 카드 만들기`
    ],
    checklist: [
      `${input.preparationDays}일 전 행사 공지와 준비물 안내 발송`,
      "행사 후 사용할 점보키즈 교직원 쿠폰함 확인",
      "사진 촬영 동선, 포토존 배경, 학부모 안내 문구 최종 점검",
      "행사 종료 후 사진 인화/포토북 정리 일정 확인"
    ],
    timeline: [
      "09:30 등원 및 이름표 확인",
      "10:00 오프닝 인사와 안전 안내",
      "10:20 메인 활동 및 반별 촬영",
      "11:30 마무리 인사와 가족 공유 사진 안내"
    ],
    parentNoticeDraft: `안녕하세요. ${input.eventName} 행사가 ${input.location}에서 진행됩니다. ${input.mood} 분위기 속에서 아이들이 즐겁게 참여할 수 있도록 준비하고 있습니다. 행사 사진은 정리 후 별도로 안내드리겠습니다.`,
    shoppingRecommendations
  });
}

function generateParentMessagesFallback(input: ParentMessageRequest): ParentMessageResult {
  const toneMap: Record<ParentMessageRequest["tone"], string> = {
    warm: "따뜻한",
    formal: "정중한",
    short: "짧고 선명한",
    emotional: "감성적인"
  };

  const purposeGuide: Record<ParentMessageRequest["purpose"], string> = {
    event_notice: "행사 안내",
    thanks: "감사 인사",
    growth_record: "성장 기록",
    participation: "참여 독려",
    apology: "양해 요청"
  };

  const prefix = `${input.senderName}에서 ${toneMap[input.tone]} 마음으로 ${purposeGuide[input.purpose]}를 전합니다.`;
  const context = input.childContext ? ` ${input.childContext}` : "";

  return parentMessageResultSchema.parse({
    candidates: [
      `${prefix} ${input.eventName}를 함께 준비하며 아이들이 보여준 기대와 설렘이 참 예뻤습니다.${context} 가정에서도 따뜻한 응원 부탁드립니다.`,
      `안녕하세요. ${input.eventName} 안내드립니다. 아이들이 안전하고 즐겁게 참여할 수 있도록 세심히 준비하겠습니다.${context}`,
      `${input.eventName}를 앞두고 아이들의 하루가 더 특별해질 수 있도록 준비하고 있습니다. 부모님께서 보내주시는 믿음과 협조에 늘 감사드립니다.`
    ],
    safetyNotes: [
      "개별 아동의 민감한 정보는 포함하지 않았습니다.",
      "과장된 효과나 구매 강요 표현을 피했습니다.",
      "실제 발송 전 행사 날짜와 준비물은 원에서 최종 확인해야 합니다."
    ]
  });
}

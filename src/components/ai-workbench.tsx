"use client";

import { Bot, Copy, Printer, Sparkles } from "lucide-react";
import { useState } from "react";
import type { EventAssistantResult, ParentMessageResult } from "@/lib/types";

const sampleAssistantResult: EventAssistantResult = {
  ideas: [
    "행사장 입구에 반별 포토존을 만들고 스탬프 미션을 연결합니다.",
    "아이들이 직접 꾸민 감사 카드를 행사 후 사진 안내와 함께 전달합니다.",
    "행사 사진을 테마별로 분류해 점보키즈 포토북 쿠폰 안내와 자연스럽게 연결합니다."
  ],
  checklist: [
    "행사 7일 전 준비물 안내",
    "행사 전날 점보키즈 쿠폰 자동 발송 확인",
    "포토존 배경, 단체 촬영 동선, 비상 연락망 점검",
    "행사 후 학부모 감사 메시지 발송"
  ],
  timeline: ["09:30 등원 및 안전 확인", "10:00 오프닝", "10:20 메인 활동", "11:20 반별 촬영"],
  parentNoticeDraft:
    "안녕하세요. 아이들이 설레는 마음으로 행사를 기다리고 있습니다. 즐겁고 안전한 시간이 될 수 있도록 세심히 준비하겠습니다.",
  shoppingRecommendations: [
    {
      title: "포토존 배경천",
      priceLabel: "20,000원대",
      mallName: "네이버 쇼핑",
      url: "https://search.shopping.naver.com/search/all?query=%ED%8F%AC%ED%86%A0%EC%A1%B4%20%EB%B0%B0%EA%B2%BD%EC%B2%9C",
      reason: "행사 사진의 완성도를 높이고 앨범/포토북 안내와 잘 맞습니다."
    },
    {
      title: "스탬프 미션 카드",
      priceLabel: "10,000원대",
      mallName: "네이버 쇼핑",
      url: "https://search.shopping.naver.com/search/all?query=%EC%8A%A4%ED%83%AC%ED%94%84%20%EB%AF%B8%EC%85%98%20%EC%B9%B4%EB%93%9C",
      reason: "아이들이 행사 흐름을 놀이처럼 따라갈 수 있습니다."
    }
  ]
};

const sampleMessageResult: ParentMessageResult = {
  candidates: [
    "안녕하세요. 아이들이 오늘 행사에서 보여준 밝은 표정과 용기가 오래 기억에 남습니다. 가정에서도 따뜻한 칭찬 부탁드립니다.",
    "함께해 주신 마음에 감사드립니다. 아이들의 소중한 순간을 오래 간직하실 수 있도록 사진 안내도 곧 전해드리겠습니다.",
    "아이들이 준비한 작은 순간마다 큰 성장이 담겨 있었습니다. 늘 믿고 응원해 주시는 부모님께 감사드립니다."
  ],
  safetyNotes: ["민감 정보 제외", "구매 강요 표현 제외", "실제 발송 전 행사명과 날짜 확인 필요"]
};

export function AiWorkbench() {
  const [assistantResult, setAssistantResult] = useState(sampleAssistantResult);
  const [messageResult, setMessageResult] = useState(sampleMessageResult);
  const [eventName, setEventName] = useState("가족 운동회");

  async function generateAssistant() {
    const response = await fetch("/api/ai/event-assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName,
        ageGroup: "전체 원아",
        preparationDays: 14,
        budget: "중간 예산",
        location: "실내 강당",
        season: "여름",
        mood: "밝고 활기찬"
      })
    });

    const payload = (await response.json()) as EventAssistantResult;
    setAssistantResult(payload);
  }

  async function generateMessages() {
    const response = await fetch("/api/ai/parent-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        purpose: "event_notice",
        tone: "warm",
        eventName,
        childContext: "행사 사진은 점보키즈 혜택 안내와 함께 전달됩니다.",
        senderName: "햇살나무 어린이집"
      })
    });

    const payload = (await response.json()) as ParentMessageResult;
    setMessageResult(payload);
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <div id="event-assistant-panel" className="rounded border border-line bg-white p-4 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-semibold text-ink">
              <Bot size={20} aria-hidden />
              AI 행사 도우미
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              행사 아이디어, 준비 체크리스트, 쇼핑 추천, 가정통신문 초안을 생성합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="no-print rounded border border-line p-2 text-muted hover:text-ink"
            aria-label="행사 계획서 인쇄"
            title="행사 계획서 인쇄"
          >
            <Printer size={18} />
          </button>
        </div>

        <div className="no-print mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            value={eventName}
            onChange={(event) => setEventName(event.target.value)}
            className="min-w-0 flex-1 rounded border border-line px-3 py-2 text-sm outline-none focus:border-brand"
            aria-label="행사명"
          />
          <button
            type="button"
            onClick={generateAssistant}
            className="flex items-center justify-center gap-2 rounded bg-brand px-4 py-2 text-sm font-semibold text-white"
          >
            <Sparkles size={17} aria-hidden />
            생성
          </button>
        </div>

        <div className="print-page mt-4 rounded border border-line bg-surface p-4">
          <h4 className="text-base font-semibold text-ink">{eventName} 계획서</h4>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <ResultList title="아이디어" items={assistantResult.ideas} />
            <ResultList title="체크리스트" items={assistantResult.checklist} />
            <ResultList title="일정표" items={assistantResult.timeline} />
            <div>
              <p className="text-sm font-semibold text-ink">가정통신문 초안</p>
              <p className="mt-2 rounded bg-white p-3 text-sm leading-6 text-muted">
                {assistantResult.parentNoticeDraft}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-sm font-semibold text-ink">행사용품 추천</p>
            <div className="mt-2 grid gap-2">
              {assistantResult.shoppingRecommendations.map((item) => (
                <a
                  key={item.title}
                  href={item.url}
                  className="rounded border border-line bg-white p-3 text-sm hover:border-brand"
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="font-semibold text-ink">{item.title}</span>
                  <span className="ml-2 text-muted">
                    {item.priceLabel} · {item.mallName}
                  </span>
                  <p className="mt-1 leading-6 text-muted">{item.reason}</p>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div id="message-writer" className="rounded border border-line bg-white p-4 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-semibold text-ink">
              <Sparkles size={20} aria-hidden />
              AI 감동 문구 생성기
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              원장님과 선생님이 학부모에게 보낼 따뜻한 메시지 후보를 만듭니다.
            </p>
          </div>
          <button
            type="button"
            onClick={generateMessages}
            className="no-print rounded bg-coral px-4 py-2 text-sm font-semibold text-white"
          >
            생성
          </button>
        </div>

        <div className="print-page mt-4 grid gap-3">
          {messageResult.candidates.map((message, index) => (
            <div key={message} className="rounded border border-line bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-ink">후보 {index + 1}</p>
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(message)}
                  className="no-print rounded border border-line p-2 text-muted hover:text-ink"
                  aria-label="문구 복사"
                  title="문구 복사"
                >
                  <Copy size={16} />
                </button>
              </div>
              <p className="mt-2 text-sm leading-7 text-muted">{message}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded border border-line bg-white p-3">
          <p className="text-sm font-semibold text-ink">안전 메모</p>
          <ul className="mt-2 grid gap-1 text-sm text-muted">
            {messageResult.safetyNotes.map((note) => (
              <li key={note}>- {note}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function ResultList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-sm font-semibold text-ink">{title}</p>
      <ul className="mt-2 grid gap-2 text-sm leading-6 text-muted">
        {items.map((item) => (
          <li key={item} className="rounded bg-white p-3">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

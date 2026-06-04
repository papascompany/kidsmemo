"use client";

import { Bot, Copy, Printer, Sparkles } from "lucide-react";
import { useState } from "react";
import type {
  EventAssistantRequest,
  EventAssistantResult,
  ParentMessageRequest,
  ParentMessageResult
} from "@/lib/types";

const purposeOptions: Array<{ value: ParentMessageRequest["purpose"]; label: string }> = [
  { value: "event_notice", label: "행사 안내" },
  { value: "thanks", label: "감사 인사" },
  { value: "growth_record", label: "성장 기록" },
  { value: "participation", label: "참여 요청" },
  { value: "apology", label: "양해/사과" }
];

const toneOptions: Array<{ value: ParentMessageRequest["tone"]; label: string }> = [
  { value: "warm", label: "따뜻하게" },
  { value: "formal", label: "정중하게" },
  { value: "short", label: "짧고 명확하게" },
  { value: "emotional", label: "감동적으로" }
];

const budgetOptions = ["낮은 예산", "중간 예산", "넉넉한 예산"];
const seasonOptions = ["봄", "여름", "가을", "겨울", "실내 계절 무관"];
const moodOptions = ["밝고 활기찬", "차분하고 따뜻한", "감동적인", "놀이 중심", "학부모 참여형"];

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
  const [assistantForm, setAssistantForm] = useState<EventAssistantRequest>({
    eventName: "가족 운동회",
    ageGroup: "전체 원아",
    preparationDays: 14,
    budget: "중간 예산",
    location: "실내 강당",
    season: "여름",
    mood: "밝고 활기찬"
  });
  const [messageForm, setMessageForm] = useState<ParentMessageRequest>({
    purpose: "event_notice",
    tone: "warm",
    eventName: "가족 운동회",
    childContext: "행사 사진은 점보키즈 혜택 안내와 함께 전달됩니다.",
    senderName: "햇살나무 어린이집"
  });
  const [assistantStatus, setAssistantStatus] = useState<string | null>(null);
  const [messageStatus, setMessageStatus] = useState<string | null>(null);
  const [isGeneratingAssistant, setIsGeneratingAssistant] = useState(false);
  const [isGeneratingMessages, setIsGeneratingMessages] = useState(false);

  function updateAssistantField<Name extends keyof EventAssistantRequest>(
    name: Name,
    value: EventAssistantRequest[Name]
  ) {
    setAssistantForm((current) => ({ ...current, [name]: value }));

    if (name === "eventName") {
      setMessageForm((current) => ({ ...current, eventName: String(value) }));
    }
  }

  function updateMessageField<Name extends keyof ParentMessageRequest>(
    name: Name,
    value: ParentMessageRequest[Name]
  ) {
    setMessageForm((current) => ({ ...current, [name]: value }));
  }

  async function generateAssistant() {
    setIsGeneratingAssistant(true);
    setAssistantStatus(null);

    try {
      const response = await fetch("/api/ai/event-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...assistantForm,
          eventName: assistantForm.eventName.trim(),
          ageGroup: assistantForm.ageGroup.trim(),
          location: assistantForm.location.trim(),
          preparationDays: Number(assistantForm.preparationDays)
        })
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const payload = unwrapData<EventAssistantResult>(await response.json());
      setAssistantResult(payload);
      setAssistantStatus("행사 계획서가 새로 생성되었습니다.");
    } catch {
      setAssistantStatus("생성에 실패했습니다. 입력값과 API 상태를 확인해주세요.");
    } finally {
      setIsGeneratingAssistant(false);
    }
  }

  async function generateMessages() {
    setIsGeneratingMessages(true);
    setMessageStatus(null);

    try {
      const response = await fetch("/api/ai/parent-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...messageForm,
          eventName: messageForm.eventName.trim(),
          senderName: messageForm.senderName.trim(),
          childContext: messageForm.childContext?.trim()
        })
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const payload = unwrapData<ParentMessageResult>(await response.json());
      setMessageResult(payload);
      setMessageStatus("학부모 메시지 후보가 새로 생성되었습니다.");
    } catch {
      setMessageStatus("생성에 실패했습니다. 입력값과 API 상태를 확인해주세요.");
    } finally {
      setIsGeneratingMessages(false);
    }
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

        <div className="no-print mt-4 grid gap-3">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="행사명" htmlFor="ai-event-name">
              <input
                id="ai-event-name"
                value={assistantForm.eventName}
                onChange={(event) => updateAssistantField("eventName", event.target.value)}
                className="min-w-0 rounded border border-line px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </Field>
            <Field label="연령/반" htmlFor="ai-age-group">
              <input
                id="ai-age-group"
                value={assistantForm.ageGroup}
                onChange={(event) => updateAssistantField("ageGroup", event.target.value)}
                className="min-w-0 rounded border border-line px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </Field>
            <Field label="준비기간" htmlFor="ai-preparation-days">
              <input
                id="ai-preparation-days"
                type="number"
                min={1}
                value={assistantForm.preparationDays}
                onChange={(event) =>
                  updateAssistantField("preparationDays", Number(event.target.value))
                }
                className="min-w-0 rounded border border-line px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </Field>
            <Field label="장소" htmlFor="ai-location">
              <input
                id="ai-location"
                value={assistantForm.location}
                onChange={(event) => updateAssistantField("location", event.target.value)}
                className="min-w-0 rounded border border-line px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </Field>
            <Field label="예산" htmlFor="ai-budget">
              <select
                id="ai-budget"
                value={assistantForm.budget}
                onChange={(event) => updateAssistantField("budget", event.target.value)}
                className="min-w-0 rounded border border-line px-3 py-2 text-sm outline-none focus:border-brand"
              >
                {budgetOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="계절" htmlFor="ai-season">
              <select
                id="ai-season"
                value={assistantForm.season}
                onChange={(event) => updateAssistantField("season", event.target.value)}
                className="min-w-0 rounded border border-line px-3 py-2 text-sm outline-none focus:border-brand"
              >
                {seasonOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="분위기" htmlFor="ai-mood">
              <select
                id="ai-mood"
                value={assistantForm.mood}
                onChange={(event) => updateAssistantField("mood", event.target.value)}
                className="min-w-0 rounded border border-line px-3 py-2 text-sm outline-none focus:border-brand"
              >
                {moodOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <button
            type="button"
            onClick={generateAssistant}
            disabled={isGeneratingAssistant}
            className="flex items-center justify-center gap-2 rounded bg-brand px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 md:justify-self-start"
          >
            <Sparkles size={17} aria-hidden />
            {isGeneratingAssistant ? "생성 중" : "생성"}
          </button>
        </div>
        {assistantStatus ? (
          <p className="no-print mt-3 rounded border border-line bg-white px-3 py-2 text-sm text-muted">
            {assistantStatus}
          </p>
        ) : null}

        <div className="print-page mt-4 rounded border border-line bg-surface p-4">
          <h4 className="text-base font-semibold text-ink">{assistantForm.eventName} 계획서</h4>
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
        <div>
          <div>
            <h3 className="flex items-center gap-2 text-lg font-semibold text-ink">
              <Sparkles size={20} aria-hidden />
              AI 감동 문구 생성기
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              원장님과 선생님이 학부모에게 보낼 따뜻한 메시지 후보를 만듭니다.
            </p>
          </div>
        </div>
        {messageStatus ? (
          <p className="no-print mt-3 rounded border border-line bg-surface px-3 py-2 text-sm text-muted">
            {messageStatus}
          </p>
        ) : null}

        <div className="no-print mt-4 grid gap-3">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="문구 목적" htmlFor="message-purpose">
              <select
                id="message-purpose"
                value={messageForm.purpose}
                onChange={(event) =>
                  updateMessageField("purpose", event.target.value as ParentMessageRequest["purpose"])
                }
                className="min-w-0 rounded border border-line px-3 py-2 text-sm outline-none focus:border-coral"
              >
                {purposeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="톤" htmlFor="message-tone">
              <select
                id="message-tone"
                value={messageForm.tone}
                onChange={(event) =>
                  updateMessageField("tone", event.target.value as ParentMessageRequest["tone"])
                }
                className="min-w-0 rounded border border-line px-3 py-2 text-sm outline-none focus:border-coral"
              >
                {toneOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="행사명" htmlFor="message-event-name">
              <input
                id="message-event-name"
                value={messageForm.eventName}
                onChange={(event) => updateMessageField("eventName", event.target.value)}
                className="min-w-0 rounded border border-line px-3 py-2 text-sm outline-none focus:border-coral"
              />
            </Field>
            <Field label="발신자" htmlFor="message-sender">
              <input
                id="message-sender"
                value={messageForm.senderName}
                onChange={(event) => updateMessageField("senderName", event.target.value)}
                className="min-w-0 rounded border border-line px-3 py-2 text-sm outline-none focus:border-coral"
              />
            </Field>
          </div>
          <Field label="아이/행사 맥락" htmlFor="message-child-context">
            <textarea
              id="message-child-context"
              value={messageForm.childContext ?? ""}
              onChange={(event) => updateMessageField("childContext", event.target.value)}
              rows={3}
              className="min-w-0 resize-y rounded border border-line px-3 py-2 text-sm leading-6 outline-none focus:border-coral"
            />
          </Field>
          <button
            type="button"
            onClick={generateMessages}
            disabled={isGeneratingMessages}
            className="rounded bg-coral px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 md:justify-self-start"
          >
            {isGeneratingMessages ? "생성 중" : "생성"}
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

function Field({
  label,
  htmlFor,
  children
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="grid gap-1 text-sm">
      <span className="text-xs font-semibold text-muted">{label}</span>
      {children}
    </label>
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

function unwrapData<T>(payload: unknown): T {
  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    (payload as { data?: unknown }).data
  ) {
    return (payload as { data: T }).data;
  }

  return payload as T;
}

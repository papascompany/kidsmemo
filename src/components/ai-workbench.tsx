"use client";

import { Bot, ChevronDown, ChevronUp, Copy, History, Printer, RotateCcw, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { authenticatedFetch } from "@/lib/auth-fetch";
import { formatDateTime } from "@/lib/format";
import type {
  AiGenerationRecord,
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
const aiCoverImage =
  "https://images.unsplash.com/photo-1587654780291-39c9404d746b?auto=format&fit=crop&w=1400&q=85";

const sampleAssistantResult: EventAssistantResult = {
  ideas: [
    "행사장 입구에 반별 포토존을 만들고 스탬프 미션을 연결합니다.",
    "아이들이 직접 꾸민 감사 카드를 행사 후 사진 안내와 함께 전달합니다.",
    "행사 사진을 테마별로 분류해 점보키즈 포토북 제작 안내와 자연스럽게 연결합니다."
  ],
  checklist: [
    "행사 7일 전 준비물 안내",
    "행사 후 사용할 점보키즈 교직원 쿠폰함 확인",
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
  ],
  providerMode: "fallback"
};

const sampleMessageResult: ParentMessageResult = {
  candidates: [
    "안녕하세요. 아이들이 오늘 행사에서 보여준 밝은 표정과 용기가 오래 기억에 남습니다. 가정에서도 따뜻한 칭찬 부탁드립니다.",
    "함께해 주신 마음에 감사드립니다. 아이들의 소중한 순간을 오래 간직하실 수 있도록 사진 안내도 곧 전해드리겠습니다.",
    "아이들이 준비한 작은 순간마다 큰 성장이 담겨 있었습니다. 늘 믿고 응원해 주시는 부모님께 감사드립니다."
  ],
  safetyNotes: ["민감 정보 제외", "구매 강요 표현 제외", "실제 발송 전 행사명과 날짜 확인 필요"],
  providerMode: "fallback"
};

export function AiWorkbench({ organizationId }: { organizationId?: string }) {
  const [activeTool, setActiveTool] = useState<"assistant" | "message">("assistant");
  const [showAssistantDetails, setShowAssistantDetails] = useState(false);
  const [showMessageDetails, setShowMessageDetails] = useState(false);
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
    childContext: "행사 사진은 정리 후 별도 안내드립니다.",
    senderName: "햇살나무 어린이집"
  });
  const [assistantStatus, setAssistantStatus] = useState<string | null>(null);
  const [messageStatus, setMessageStatus] = useState<string | null>(null);
  const [historyStatus, setHistoryStatus] = useState<string | null>(null);
  const [history, setHistory] = useState<AiGenerationRecord[]>([]);
  const [isGeneratingAssistant, setIsGeneratingAssistant] = useState(false);
  const [isGeneratingMessages, setIsGeneratingMessages] = useState(false);

  const loadHistory = useCallback(async () => {
    try {
      const response = await authenticatedFetch("/api/ai/history?limit=6", { organizationId });
      if (!response.ok) {
        setHistoryStatus("최근 이력은 로그인 후 live 기관 범위에서 불러올 수 있습니다.");
        return;
      }

      const payload = unwrapData<{ history: AiGenerationRecord[] }>(await response.json());
      setHistory(Array.isArray(payload.history) ? payload.history : []);
      setHistoryStatus(null);
    } catch {
      setHistoryStatus("최근 이력은 현재 데모 데이터로 표시됩니다.");
    }
  }, [organizationId]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

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
      const response = await authenticatedFetch("/api/ai/event-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        organizationId,
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
      setAssistantStatus(
        payload.providerMode === "fallback"
          ? "AI 연결 전 fallback 결과입니다. 실제 AI 결과가 필요하면 운영 키를 설정해 주세요."
          : "행사 계획서가 새로 생성되었습니다."
      );
      await loadHistory();
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
      const response = await authenticatedFetch("/api/ai/parent-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        organizationId,
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
      setMessageStatus(
        payload.providerMode === "fallback"
          ? "AI 연결 전 fallback 문구입니다. 실제 AI 결과가 필요하면 운영 키를 설정해 주세요."
          : "학부모 메시지 후보가 새로 생성되었습니다."
      );
      await loadHistory();
    } catch {
      setMessageStatus("생성에 실패했습니다. 입력값과 API 상태를 확인해주세요.");
    } finally {
      setIsGeneratingMessages(false);
    }
  }

  function reuseHistory(record: AiGenerationRecord) {
    if (record.kind === "event_assistant" && isEventAssistantRequest(record.input) && isEventAssistantResult(record.output)) {
      setActiveTool("assistant");
      setAssistantForm(record.input);
      setAssistantResult(record.output);
      setAssistantStatus("저장된 행사 도우미 결과를 불러왔습니다.");
      return;
    }

    if (record.kind === "parent_message" && isParentMessageRequest(record.input) && isParentMessageResult(record.output)) {
      setActiveTool("message");
      setMessageForm(record.input);
      setMessageResult(record.output);
      setMessageStatus("저장된 학부모 메시지 결과를 불러왔습니다.");
    }
  }

  return (
    <div className="grid gap-4">
      <div className="no-print grid grid-cols-2 gap-2 rounded-2xl border border-line bg-[#fffefa] p-2 shadow-soft">
        <button
          type="button"
          onClick={() => setActiveTool("assistant")}
          className={`inline-flex min-h-11 items-center justify-center gap-2 rounded px-3 text-sm font-semibold transition ${
            activeTool === "assistant" ? "rounded-xl bg-brand text-white" : "rounded-xl bg-surface text-muted"
          }`}
        >
          <Bot size={17} aria-hidden />
          행사 도우미
        </button>
        <button
          type="button"
          onClick={() => setActiveTool("message")}
          className={`inline-flex min-h-11 items-center justify-center gap-2 rounded px-3 text-sm font-semibold transition ${
            activeTool === "message" ? "rounded-xl bg-coral text-white" : "rounded-xl bg-surface text-muted"
          }`}
        >
          <Sparkles size={17} aria-hidden />
          문구 생성기
        </button>
      </div>

      <section className="no-print rounded-2xl border border-line bg-[#fffefa] p-4 shadow-soft">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <h3 className="flex items-center gap-2 text-base font-semibold text-ink">
              <History size={18} aria-hidden />
              최근 AI 이력
            </h3>
            <p className="mt-1 text-sm leading-6 text-muted">
              현재 기관에서 생성한 결과를 다시 불러와 이어서 사용할 수 있습니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadHistory()}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded border border-line bg-white px-3 text-sm font-semibold text-muted transition hover:border-brand hover:text-brand"
          >
            <RotateCcw size={16} aria-hidden />
            새로고침
          </button>
        </div>

        {historyStatus ? <p className="mt-3 text-sm font-semibold text-muted">{historyStatus}</p> : null}

        <div className="mt-3 grid gap-2 lg:grid-cols-3">
          {history.length > 0 ? (
            history.map((record) => (
              <button
                key={record.id}
                type="button"
                onClick={() => reuseHistory(record)}
                className="min-h-28 rounded border border-line bg-surface p-3 text-left transition hover:border-brand hover:bg-white"
              >
                <span className="text-xs font-semibold text-muted">
                  {record.kind === "event_assistant" ? "행사 도우미" : "문구 생성기"}
                </span>
                <span className="mt-1 block text-sm font-semibold text-ink">{getHistoryTitle(record)}</span>
                <span className="mt-2 line-clamp-2 block text-sm leading-6 text-muted">
                  {getHistorySummary(record)}
                </span>
                <span className="mt-2 block text-xs font-semibold text-muted">
                  {formatDateTime(record.createdAt)}
                </span>
              </button>
            ))
          ) : (
            <div className="rounded border border-dashed border-line bg-surface p-4 text-sm leading-6 text-muted lg:col-span-3">
              아직 저장된 AI 이력이 없습니다. 결과를 생성하면 이곳에 최근 항목이 표시됩니다.
            </div>
          )}
        </div>
      </section>

      <div
        id="event-assistant-panel"
        className={`${activeTool === "assistant" ? "block" : "hidden"} overflow-hidden rounded-2xl border border-line bg-[#fffefa] shadow-soft`}
      >
        <div className="relative overflow-hidden bg-ink p-4 text-white">
          <div className="absolute inset-0 bg-cover bg-center opacity-35" style={{ backgroundImage: `url(${aiCoverImage})` }} />
          <div className="relative flex items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Bot size={20} aria-hidden />
              AI 행사 도우미
            </h3>
            <p className="mt-2 text-sm leading-6 text-white/84">행사명만 입력하면 사진 같은 하루를 위한 초안을 만듭니다.</p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="no-print grid min-h-11 min-w-11 place-items-center rounded-full border border-white/35 bg-white/10 text-white hover:bg-white/20"
            aria-label="행사 계획서 인쇄"
            title="행사 계획서 인쇄"
          >
            <Printer size={18} />
          </button>
          </div>
        </div>

        <div className="no-print grid gap-3 p-4">
          <Field label="행사명" htmlFor="ai-event-name" required>
            <input
              id="ai-event-name"
              value={assistantForm.eventName}
              onChange={(event) => updateAssistantField("eventName", event.target.value)}
              className="min-w-0 rounded border border-line px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </Field>
          <button
            type="button"
            onClick={() => setShowAssistantDetails((current) => !current)}
            className="inline-flex min-h-11 items-center justify-between rounded border border-line bg-white px-3 text-sm font-semibold text-muted transition hover:border-brand hover:text-brand"
            aria-expanded={showAssistantDetails}
            aria-controls="assistant-details"
          >
            <span>{showAssistantDetails ? "상세 설정 접기" : "연령, 예산, 장소 등 상세 설정"}</span>
            {showAssistantDetails ? <ChevronUp size={18} aria-hidden /> : <ChevronDown size={18} aria-hidden />}
          </button>
          {showAssistantDetails ? (
            <div id="assistant-details" className="grid gap-3 rounded border border-line bg-surface p-3 md:grid-cols-2">
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
          ) : null}
          <button
            type="button"
            onClick={generateAssistant}
            disabled={isGeneratingAssistant || !assistantForm.eventName.trim()}
            className="flex min-h-11 items-center justify-center gap-2 rounded bg-brand px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 md:justify-self-start"
          >
            <Sparkles size={17} aria-hidden />
            {isGeneratingAssistant ? "계획서 만드는 중" : "행사 계획서 만들기"}
          </button>
        </div>
        {assistantStatus ? (
          <p className="no-print mx-4 rounded border border-line bg-white px-3 py-2 text-sm text-muted">
            {assistantStatus}
          </p>
        ) : null}

        <div className="print-page m-4 rounded-xl border border-line bg-surface p-4">
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

      <div
        id="message-writer"
        className={`${activeTool === "message" ? "block" : "hidden"} rounded-2xl border border-line bg-[#fffefa] p-4 shadow-soft`}
      >
        <div>
          <div>
            <h3 className="flex items-center gap-2 text-lg font-semibold text-ink">
              <Sparkles size={20} aria-hidden />
              AI 감동 문구 생성기
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted">목적과 행사명만 정하면 바로 메시지 후보를 만듭니다.</p>
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
            <Field label="행사명" htmlFor="message-event-name" required>
              <input
                id="message-event-name"
                value={messageForm.eventName}
                onChange={(event) => updateMessageField("eventName", event.target.value)}
                className="min-w-0 rounded border border-line px-3 py-2 text-sm outline-none focus:border-coral"
              />
            </Field>
          </div>
          <button
            type="button"
            onClick={() => setShowMessageDetails((current) => !current)}
            className="inline-flex min-h-11 items-center justify-between rounded border border-line bg-white px-3 text-sm font-semibold text-muted transition hover:border-coral hover:text-coral"
            aria-expanded={showMessageDetails}
            aria-controls="message-details"
          >
            <span>{showMessageDetails ? "상세 설정 접기" : "톤, 발신자, 상황 등 상세 설정"}</span>
            {showMessageDetails ? <ChevronUp size={18} aria-hidden /> : <ChevronDown size={18} aria-hidden />}
          </button>
          {showMessageDetails ? (
            <div id="message-details" className="grid gap-3 rounded border border-line bg-surface p-3">
              <div className="grid gap-3 md:grid-cols-2">
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
            </div>
          ) : null}
          <button
            type="button"
            onClick={generateMessages}
            disabled={isGeneratingMessages || !messageForm.eventName.trim()}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded bg-coral px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 md:justify-self-start"
          >
            <Sparkles size={17} aria-hidden />
            {isGeneratingMessages ? "문구 만드는 중" : "학부모 문구 만들기"}
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
                  className="no-print grid min-h-11 min-w-11 place-items-center rounded border border-line text-muted hover:text-ink"
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
  children,
  required = false
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="grid gap-1 text-sm">
      <span className="text-xs font-semibold text-muted">
        {label}{required ? <span className="ml-1 text-coral">*</span> : null}
      </span>
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

function isEventAssistantRequest(value: unknown): value is EventAssistantRequest {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as EventAssistantRequest).eventName === "string" &&
      typeof (value as EventAssistantRequest).ageGroup === "string" &&
      typeof (value as EventAssistantRequest).preparationDays === "number"
  );
}

function isEventAssistantResult(value: unknown): value is EventAssistantResult {
  return Boolean(
    value &&
      typeof value === "object" &&
      Array.isArray((value as EventAssistantResult).ideas) &&
      Array.isArray((value as EventAssistantResult).checklist) &&
      Array.isArray((value as EventAssistantResult).timeline)
  );
}

function isParentMessageRequest(value: unknown): value is ParentMessageRequest {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as ParentMessageRequest).eventName === "string" &&
      typeof (value as ParentMessageRequest).senderName === "string"
  );
}

function isParentMessageResult(value: unknown): value is ParentMessageResult {
  return Boolean(
    value &&
      typeof value === "object" &&
      Array.isArray((value as ParentMessageResult).candidates) &&
      Array.isArray((value as ParentMessageResult).safetyNotes)
  );
}

function getHistoryTitle(record: AiGenerationRecord) {
  const input = record.input as Partial<EventAssistantRequest & ParentMessageRequest>;
  return input.eventName || "이름 없는 AI 생성";
}

function getHistorySummary(record: AiGenerationRecord) {
  if (record.kind === "event_assistant" && isEventAssistantResult(record.output)) {
    return record.output.ideas[0] ?? record.output.parentNoticeDraft;
  }

  if (record.kind === "parent_message" && isParentMessageResult(record.output)) {
    return record.output.candidates[0] ?? record.output.safetyNotes[0];
  }

  return "저장된 결과를 다시 불러올 수 있습니다.";
}

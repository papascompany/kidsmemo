"use client";

import {
  Bell,
  CalendarCheck,
  FileText,
  Gift,
  Image as ImageIcon,
  Loader2,
  LockKeyhole,
  Save,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/badge";
import { authenticatedFetch } from "@/lib/auth-fetch";
import type {
  AdminAttendanceRecord,
  AdminContentBlock,
  AdminGiftCode,
  AdminMediaAsset,
  AdminOperationsPayload,
  AdminPushCampaign
} from "@/lib/admin-operations";

type AdminTab = "content" | "media" | "attendance" | "gifts" | "push" | "audit";
type SaveState = "idle" | "saving" | "saved" | "error";

const tabs: Array<{ id: AdminTab; label: string; icon: typeof FileText }> = [
  { id: "content", label: "콘텐츠", icon: FileText },
  { id: "media", label: "이미지", icon: ImageIcon },
  { id: "attendance", label: "출석", icon: CalendarCheck },
  { id: "gifts", label: "상품권/코드", icon: Gift },
  { id: "push", label: "푸시알림", icon: Bell },
  { id: "audit", label: "감사로그", icon: ShieldCheck }
];

const emptyPayload: AdminOperationsPayload = {
  contentBlocks: [],
  mediaAssets: [],
  attendanceRecords: [],
  giftCodes: [],
  pushCampaigns: [],
  auditLogs: []
};

const defaultContentForm = {
  scope: "landing",
  organizationId: "",
  slot: "hero",
  title: "",
  body: "",
  imageUrl: "",
  ctaLabel: "",
  ctaUrl: "",
  sortOrder: "0",
  status: "draft"
};

const defaultMediaForm = {
  scope: "landing",
  organizationId: "",
  label: "",
  url: "",
  altText: "",
  usageSlot: "",
  status: "draft"
};

const defaultAttendanceForm = {
  organizationId: "",
  attendanceDate: new Date().toISOString().slice(0, 10),
  className: "",
  childName: "",
  status: "present",
  note: ""
};

const defaultGiftForm = {
  organizationId: "",
  title: "",
  code: "",
  amountLabel: "",
  status: "available",
  assignedToProfileId: "",
  expiresAt: ""
};

const defaultPushForm = {
  organizationId: "",
  title: "",
  body: "",
  targetRole: "",
  status: "draft",
  scheduledFor: ""
};

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>("content");
  const [payload, setPayload] = useState<AdminOperationsPayload>(emptyPayload);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "denied">("loading");
  const [message, setMessage] = useState("운영 콘솔 권한을 확인하고 있습니다.");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [contentForm, setContentForm] = useState(defaultContentForm);
  const [mediaForm, setMediaForm] = useState(defaultMediaForm);
  const [attendanceForm, setAttendanceForm] = useState(defaultAttendanceForm);
  const [giftForm, setGiftForm] = useState(defaultGiftForm);
  const [pushForm, setPushForm] = useState(defaultPushForm);

  useEffect(() => {
    void loadOperations();
  }, []);

  const publishedLandingCount = useMemo(
    () => payload.contentBlocks.filter((block) => block.scope === "landing" && block.status === "published").length,
    [payload.contentBlocks]
  );

  async function loadOperations() {
    setLoadState("loading");
    const response = await authenticatedFetch("/api/admin/operations");
    if (!response.ok) {
      setLoadState("denied");
      setMessage("platform admin 계정으로 로그인해야 운영 콘솔을 사용할 수 있습니다.");
      return;
    }

    const data = unwrapData<AdminOperationsPayload>(await response.json());
    setPayload(data);
    setLoadState("ready");
    setMessage("운영 콘솔이 live 관리자 세션으로 연결되었습니다.");
  }

  async function saveResource(resource: string, formPayload: Record<string, unknown>) {
    setSaveState("saving");
    const response = await authenticatedFetch("/api/admin/operations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resource,
        payload: normalizePayload(formPayload)
      })
    });

    if (!response.ok) {
      setSaveState("error");
      setMessage("저장에 실패했습니다. 관리자 권한과 입력값을 확인해 주세요.");
      return;
    }

    setSaveState("saved");
    setMessage("운영 설정이 저장되었습니다.");
    await loadOperations();
  }

  return (
    <main className="min-h-screen bg-surface px-4 py-6 text-ink sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="rounded border border-line bg-white p-5 shadow-soft">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <Link href="/" className="text-sm font-semibold text-brand">
                키즈메모
              </Link>
              <h1 className="mt-2 text-3xl font-semibold tracking-normal">운영 관리자 콘솔</h1>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-muted">
                랜딩 콘텐츠, 기관별 이미지, 출석, 상품권/쿠폰 코드, 푸시알림을 관리하는
                platform admin 전용 운영 화면입니다.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone={loadState === "ready" ? "green" : "amber"}>
                {loadState === "ready" ? "Admin Session" : loadState === "loading" ? "권한 확인 중" : "접근 제한"}
              </Badge>
              <Badge tone="blue">Live Operations MVP</Badge>
            </div>
          </div>
          <p className="mt-4 rounded border border-line bg-surface px-3 py-2 text-sm font-semibold text-muted">
            {message}
          </p>
        </header>

        {loadState === "denied" ? (
          <AccessDenied />
        ) : (
          <>
            <section className="mt-5 grid gap-3 md:grid-cols-5">
              <Metric label="게시 랜딩" value={`${publishedLandingCount}개`} />
              <Metric label="이미지" value={`${payload.mediaAssets.length}개`} />
              <Metric label="출석 레코드" value={`${payload.attendanceRecords.length}건`} />
              <Metric label="상품권/코드" value={`${payload.giftCodes.length}개`} />
              <Metric label="푸시 캠페인" value={`${payload.pushCampaigns.length}건`} />
            </section>

            <nav className="mt-5 flex gap-2 overflow-x-auto pb-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded border px-4 text-sm font-semibold transition ${
                      activeTab === tab.id
                        ? "border-brand bg-brand text-white"
                        : "border-line bg-white text-muted hover:border-brand hover:text-ink"
                    }`}
                  >
                    <Icon size={17} aria-hidden />
                    {tab.label}
                  </button>
                );
              })}
            </nav>

            <section className="mt-5">
              {loadState === "loading" ? (
                <LoadingPanel />
              ) : (
                <>
                  {activeTab === "content" ? (
                    <ContentPanel
                      blocks={payload.contentBlocks}
                      form={contentForm}
                      onChange={setContentForm}
                      onSave={() => saveResource("contentBlocks", contentForm)}
                      saveState={saveState}
                    />
                  ) : null}
                  {activeTab === "media" ? (
                    <MediaPanel
                      assets={payload.mediaAssets}
                      form={mediaForm}
                      onChange={setMediaForm}
                      onSave={() => saveResource("mediaAssets", mediaForm)}
                      saveState={saveState}
                    />
                  ) : null}
                  {activeTab === "attendance" ? (
                    <AttendancePanel
                      records={payload.attendanceRecords}
                      form={attendanceForm}
                      onChange={setAttendanceForm}
                      onSave={() => saveResource("attendanceRecords", attendanceForm)}
                      saveState={saveState}
                    />
                  ) : null}
                  {activeTab === "gifts" ? (
                    <GiftPanel
                      codes={payload.giftCodes}
                      form={giftForm}
                      onChange={setGiftForm}
                      onSave={() => saveResource("giftCodes", giftForm)}
                      saveState={saveState}
                    />
                  ) : null}
                  {activeTab === "push" ? (
                    <PushPanel
                      campaigns={payload.pushCampaigns}
                      form={pushForm}
                      onChange={setPushForm}
                      onSave={() => saveResource("pushCampaigns", pushForm)}
                      saveState={saveState}
                    />
                  ) : null}
                  {activeTab === "audit" ? <AuditPanel logs={payload.auditLogs} /> : null}
                </>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function ContentPanel({
  blocks,
  form,
  onChange,
  onSave,
  saveState
}: {
  blocks: AdminContentBlock[];
  form: typeof defaultContentForm;
  onChange: (form: typeof defaultContentForm) => void;
  onSave: () => void;
  saveState: SaveState;
}) {
  return (
    <EditorLayout
      title="사이트/기관 콘텐츠 관리"
      description="랜딩 히어로, 기능 카드, 기관별 소개 문구와 이미지 슬롯을 운영자가 관리합니다."
      onSave={onSave}
      saveState={saveState}
      list={<ContentList blocks={blocks} />}
    >
      <div className="grid gap-3 md:grid-cols-2">
        <SelectField label="범위" value={form.scope} onChange={(scope) => onChange({ ...form, scope })} options={["landing", "organization"]} />
        <Field label="기관 ID" value={form.organizationId} onChange={(organizationId) => onChange({ ...form, organizationId })} placeholder="기관 콘텐츠일 때만 입력" />
        <Field label="슬롯" value={form.slot} onChange={(slot) => onChange({ ...form, slot })} placeholder="hero, feature-1, footer-cta" />
        <SelectField label="상태" value={form.status} onChange={(status) => onChange({ ...form, status })} options={["draft", "published", "archived"]} />
        <Field label="제목" value={form.title} onChange={(title) => onChange({ ...form, title })} placeholder="운영 화면에 표시할 제목" />
        <Field label="이미지 URL" value={form.imageUrl} onChange={(imageUrl) => onChange({ ...form, imageUrl })} placeholder="https://..." />
        <Field label="CTA 라벨" value={form.ctaLabel} onChange={(ctaLabel) => onChange({ ...form, ctaLabel })} placeholder="간편가입 시작하기" />
        <Field label="CTA URL" value={form.ctaUrl} onChange={(ctaUrl) => onChange({ ...form, ctaUrl })} placeholder="/signup" />
      </div>
      <TextArea label="본문" value={form.body} onChange={(body) => onChange({ ...form, body })} placeholder="콘텐츠 본문" />
    </EditorLayout>
  );
}

function MediaPanel({
  assets,
  form,
  onChange,
  onSave,
  saveState
}: {
  assets: AdminMediaAsset[];
  form: typeof defaultMediaForm;
  onChange: (form: typeof defaultMediaForm) => void;
  onSave: () => void;
  saveState: SaveState;
}) {
  return (
    <EditorLayout
      title="이미지 등록/교체"
      description="랜딩과 기관 페이지에 쓰는 이미지 URL, alt 텍스트, 사용 위치를 추적합니다."
      onSave={onSave}
      saveState={saveState}
      list={<MediaList assets={assets} />}
    >
      <div className="grid gap-3 md:grid-cols-2">
        <SelectField label="범위" value={form.scope} onChange={(scope) => onChange({ ...form, scope })} options={["landing", "organization"]} />
        <Field label="기관 ID" value={form.organizationId} onChange={(organizationId) => onChange({ ...form, organizationId })} placeholder="선택 사항" />
        <Field label="라벨" value={form.label} onChange={(label) => onChange({ ...form, label })} placeholder="랜딩 히어로 이미지" />
        <Field label="사용 위치" value={form.usageSlot} onChange={(usageSlot) => onChange({ ...form, usageSlot })} placeholder="hero" />
        <SelectField label="상태" value={form.status} onChange={(status) => onChange({ ...form, status })} options={["draft", "published", "archived"]} />
        <Field label="이미지 URL" value={form.url} onChange={(url) => onChange({ ...form, url })} placeholder="https://..." />
        <Field label="대체 텍스트" value={form.altText} onChange={(altText) => onChange({ ...form, altText })} placeholder="아이들이 교실에서 활동하는 사진" />
      </div>
    </EditorLayout>
  );
}

function AttendancePanel({
  records,
  form,
  onChange,
  onSave,
  saveState
}: {
  records: AdminAttendanceRecord[];
  form: typeof defaultAttendanceForm;
  onChange: (form: typeof defaultAttendanceForm) => void;
  onSave: () => void;
  saveState: SaveState;
}) {
  return (
    <EditorLayout
      title="출석체크 관리"
      description="기관/반/일자별 원아 출석 상태를 등록하고 운영자가 마감 상태를 점검합니다."
      onSave={onSave}
      saveState={saveState}
      list={<RecordList emptyLabel="등록된 출석 레코드가 없습니다." items={records.map((record) => `${record.attendanceDate} · ${record.className} · ${record.childName} · ${record.status}`)} />}
    >
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="기관 ID" value={form.organizationId} onChange={(organizationId) => onChange({ ...form, organizationId })} placeholder="organization uuid" />
        <Field label="날짜" value={form.attendanceDate} onChange={(attendanceDate) => onChange({ ...form, attendanceDate })} placeholder="2026-06-22" />
        <Field label="반" value={form.className} onChange={(className) => onChange({ ...form, className })} placeholder="햇님반" />
        <Field label="원아명" value={form.childName} onChange={(childName) => onChange({ ...form, childName })} placeholder="김하늘" />
        <SelectField label="상태" value={form.status} onChange={(status) => onChange({ ...form, status })} options={["present", "absent", "late", "excused"]} />
        <Field label="메모" value={form.note} onChange={(note) => onChange({ ...form, note })} placeholder="보호자 연락 완료" />
      </div>
    </EditorLayout>
  );
}

function GiftPanel({
  codes,
  form,
  onChange,
  onSave,
  saveState
}: {
  codes: AdminGiftCode[];
  form: typeof defaultGiftForm;
  onChange: (form: typeof defaultGiftForm) => void;
  onSave: () => void;
  saveState: SaveState;
}) {
  return (
    <EditorLayout
      title="상품권/쿠폰 코드 등록과 지급"
      description="운영자가 기관 또는 교직원에게 지급할 코드 재고와 지급 상태를 관리합니다."
      onSave={onSave}
      saveState={saveState}
      list={<RecordList emptyLabel="등록된 상품권/코드가 없습니다." items={codes.map((code) => `${code.title} · ${code.code} · ${code.status}`)} />}
    >
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="기관 ID" value={form.organizationId} onChange={(organizationId) => onChange({ ...form, organizationId })} placeholder="선택 사항" />
        <Field label="제목" value={form.title} onChange={(title) => onChange({ ...form, title })} placeholder="점보키즈 포토북 상품권" />
        <Field label="코드" value={form.code} onChange={(code) => onChange({ ...form, code })} placeholder="JK-GIFT-0001" />
        <Field label="혜택 라벨" value={form.amountLabel} onChange={(amountLabel) => onChange({ ...form, amountLabel })} placeholder="10,000원" />
        <SelectField label="상태" value={form.status} onChange={(status) => onChange({ ...form, status })} options={["available", "issued", "redeemed", "expired", "void"]} />
        <Field label="만료 시각" value={form.expiresAt} onChange={(expiresAt) => onChange({ ...form, expiresAt })} placeholder="2026-12-31T14:59:59.000Z" />
      </div>
    </EditorLayout>
  );
}

function PushPanel({
  campaigns,
  form,
  onChange,
  onSave,
  saveState
}: {
  campaigns: AdminPushCampaign[];
  form: typeof defaultPushForm;
  onChange: (form: typeof defaultPushForm) => void;
  onSave: () => void;
  saveState: SaveState;
}) {
  return (
    <EditorLayout
      title="푸시알림/운영 메시지"
      description="대상 기관/역할, 예약 시간, 제목과 본문을 지정해 운영 알림 캠페인을 준비합니다."
      onSave={onSave}
      saveState={saveState}
      list={<RecordList emptyLabel="등록된 푸시 캠페인이 없습니다." items={campaigns.map((campaign) => `${campaign.title} · ${campaign.status} · ${campaign.scheduledFor ?? "즉시"}`)} />}
    >
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="기관 ID" value={form.organizationId} onChange={(organizationId) => onChange({ ...form, organizationId })} placeholder="선택 사항" />
        <Field label="제목" value={form.title} onChange={(title) => onChange({ ...form, title })} placeholder="내일 행사 안내" />
        <SelectField label="대상 역할" value={form.targetRole} onChange={(targetRole) => onChange({ ...form, targetRole })} options={["", "owner", "manager", "teacher"]} />
        <SelectField label="상태" value={form.status} onChange={(status) => onChange({ ...form, status })} options={["draft", "scheduled", "sent", "failed", "cancelled"]} />
        <Field label="예약 시각" value={form.scheduledFor} onChange={(scheduledFor) => onChange({ ...form, scheduledFor })} placeholder="2026-06-23T00:00:00.000Z" />
      </div>
      <TextArea label="본문" value={form.body} onChange={(body) => onChange({ ...form, body })} placeholder="알림 본문" />
    </EditorLayout>
  );
}

function AuditPanel({ logs }: { logs: AdminOperationsPayload["auditLogs"] }) {
  return (
    <div className="rounded border border-line bg-white p-5 shadow-soft">
      <h2 className="text-2xl font-semibold tracking-normal">운영 감사로그</h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        관리자 저장 작업은 `admin_audit_logs`에 기록됩니다.
      </p>
      <RecordList
        emptyLabel="아직 감사로그가 없습니다."
        items={logs.map((log) => `${log.createdAt} · ${log.action} · ${log.resourceType}`)}
      />
    </div>
  );
}

function EditorLayout({
  title,
  description,
  children,
  list,
  onSave,
  saveState
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  list: React.ReactNode;
  onSave: () => void;
  saveState: SaveState;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
      <section className="rounded border border-line bg-white p-5 shadow-soft">
        <h2 className="text-2xl font-semibold tracking-normal">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
        <div className="mt-5 grid gap-4">{children}</div>
        <button
          type="button"
          onClick={onSave}
          disabled={saveState === "saving"}
          className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded bg-brand px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {saveState === "saving" ? <Loader2 size={17} className="animate-spin" aria-hidden /> : <Save size={17} aria-hidden />}
          {saveState === "saving" ? "저장 중" : "저장"}
        </button>
      </section>
      <aside className="rounded border border-line bg-white p-5 shadow-soft">{list}</aside>
    </div>
  );
}

function ContentList({ blocks }: { blocks: AdminContentBlock[] }) {
  return (
    <RecordList
      emptyLabel="등록된 콘텐츠 블록이 없습니다."
      items={blocks.map((block) => `${block.scope} · ${block.slot} · ${block.title || "제목 없음"} · ${block.status}`)}
    />
  );
}

function MediaList({ assets }: { assets: AdminMediaAsset[] }) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-ink">등록 이미지</h3>
      <div className="mt-4 grid gap-3">
        {assets.length > 0 ? (
          assets.map((asset) => (
            <div key={asset.id} className="rounded border border-line bg-surface p-3">
              <p className="font-semibold text-ink">{asset.label}</p>
              <p className="mt-1 break-all text-xs text-muted">{asset.url}</p>
              <p className="mt-2 text-xs font-semibold text-brand">
                {asset.usageSlot || "사용 위치 미지정"} · {asset.status}
              </p>
            </div>
          ))
        ) : (
          <p className="rounded border border-dashed border-line bg-surface p-4 text-sm text-muted">
            관리 중인 이미지가 없습니다.
          </p>
        )}
      </div>
    </div>
  );
}

function RecordList({ emptyLabel, items }: { emptyLabel: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-ink">현재 레코드</h3>
      <div className="mt-4 grid gap-3">
        {items.length > 0 ? (
          items.map((item) => (
            <p key={item} className="rounded border border-line bg-surface p-3 text-sm font-semibold text-muted">
              {item}
            </p>
          ))
        ) : (
          <p className="rounded border border-dashed border-line bg-surface p-4 text-sm text-muted">
            {emptyLabel}
          </p>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded border border-line bg-surface px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
        placeholder={placeholder}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded border border-line bg-surface px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option || "전체"}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink">
      {label}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="resize-none rounded border border-line bg-surface px-3 py-2 text-sm leading-6 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
        placeholder={placeholder}
      />
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-line bg-white p-4 shadow-soft">
      <p className="text-sm font-semibold text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold text-ink">{value}</p>
    </div>
  );
}

function LoadingPanel() {
  return (
    <div className="grid min-h-64 place-items-center rounded border border-line bg-white p-5 shadow-soft">
      <div className="flex items-center gap-3 text-sm font-semibold text-muted">
        <Loader2 className="animate-spin" size={18} aria-hidden />
        운영 데이터를 불러오는 중입니다.
      </div>
    </div>
  );
}

function AccessDenied() {
  return (
    <section className="mt-5 rounded border border-line bg-white p-8 text-center shadow-soft">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded bg-brand/10 text-brand">
        <LockKeyhole size={24} aria-hidden />
      </div>
      <h2 className="mt-4 text-2xl font-semibold tracking-normal">운영자 권한이 필요합니다.</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted">
        이 화면은 platform admin 계정만 사용할 수 있습니다. 일반 원장/선생님 계정에는 운영 데이터가 표시되지 않습니다.
      </p>
      <Link
        href="/login"
        className="mt-5 inline-flex min-h-11 items-center justify-center rounded bg-brand px-4 py-2.5 text-sm font-semibold text-white"
      >
        로그인으로 이동
      </Link>
    </section>
  );
}

function normalizePayload(payload: Record<string, unknown>) {
  const nullableKeys = new Set([
    "organizationId",
    "assignedToProfileId",
    "expiresAt",
    "scheduledFor",
    "targetRole"
  ]);

  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [
      key,
      nullableKeys.has(key) && value === "" ? null : value
    ])
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

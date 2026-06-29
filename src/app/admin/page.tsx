"use client";

import {
  Bell,
  CalendarCheck,
  FileText,
  Gift,
  Image as ImageIcon,
  Loader2,
  LockKeyhole,
  Plus,
  RefreshCw,
  Send,
  Save,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AdminOrganizationSelect } from "@/components/admin-organization-select";
import { Badge } from "@/components/badge";
import { authenticatedFetch } from "@/lib/auth-fetch";
import type { AttendanceRoster, AttendanceRosterItem } from "@/lib/attendance-operations";
import type {
  AdminContentBlock,
  AdminGiftCode,
  AdminMediaAsset,
  AdminOperationsPayload,
  AdminPushCampaign,
  AdminStaffCoupon
} from "@/lib/admin-operations";
import type { PushDeliveryLog } from "@/lib/push-operations";

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
  staffCoupons: [],
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

const defaultStaffCouponForm = {
  id: "",
  organizationId: "",
  title: "",
  description: "",
  code: "",
  amountLabel: "",
  validUntil: new Date().toISOString().slice(0, 10),
  assignedTo: "all_staff",
  status: "available",
  sites: "jumbokids",
  jumbokidsUrl: "",
  godomallUrl: ""
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
  const [giftForm, setGiftForm] = useState(defaultGiftForm);
  const [staffCouponForm, setStaffCouponForm] = useState(defaultStaffCouponForm);
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
              <Metric label="쿠폰함 코드" value={`${payload.staffCoupons.length}개`} />
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
                    <AttendancePanel />
                  ) : null}
                  {activeTab === "gifts" ? (
                    <GiftPanel
                      codes={payload.giftCodes}
                      staffCoupons={payload.staffCoupons}
                      form={giftForm}
                      staffCouponForm={staffCouponForm}
                      onChange={setGiftForm}
                      onStaffCouponChange={setStaffCouponForm}
                      onSave={() => saveResource("giftCodes", giftForm)}
                      onStaffCouponSave={() => saveResource("staffCoupons", serializeStaffCouponForm(staffCouponForm))}
                      onStaffCouponEdit={setStaffCouponForm}
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
        <SelectField
          label="범위"
          value={form.scope}
          onChange={(scope) => onChange({ ...form, scope, organizationId: scope === "landing" ? "" : form.organizationId })}
          options={["landing", "organization"]}
        />
        <AdminOrganizationSelect
          label="기관"
          value={form.organizationId}
          disabled={form.scope === "landing"}
          onChange={(organizationId) => onChange({ ...form, organizationId })}
          placeholder={form.scope === "landing" ? "랜딩 콘텐츠는 기관을 선택하지 않습니다" : "기관명 또는 지역 검색"}
        />
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
  const [file, setFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<SaveState>("idle");
  const [uploadMessage, setUploadMessage] = useState("");

  async function uploadMedia() {
    if (!file || !form.usageSlot.trim()) {
      setUploadState("error");
      setUploadMessage("이미지 파일과 사용 위치를 먼저 입력해 주세요.");
      return;
    }

    setUploadState("saving");
    setUploadMessage("");
    const formData = new FormData();
    formData.set("file", file);
    formData.set("slot", form.usageSlot.trim());
    formData.set("scope", form.scope);
    if (form.organizationId) formData.set("organizationId", form.organizationId);
    formData.set("label", form.label || file.name);
    formData.set("altText", form.altText);
    formData.set("status", form.status);

    const response = await authenticatedFetch("/api/admin/media-upload", {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      setUploadState("error");
      setUploadMessage("이미지 업로드에 실패했습니다.");
      return;
    }

    const result = unwrapData<{ publicUrl: string }>(await response.json());
    onChange({ ...form, url: result.publicUrl, label: form.label || file.name });
    setUploadState("saved");
    setUploadMessage("이미지를 업로드했고 URL을 입력칸에 반영했습니다.");
  }

  return (
    <EditorLayout
      title="이미지 등록/교체"
      description="랜딩과 기관 페이지에 쓰는 이미지 URL, alt 텍스트, 사용 위치를 추적합니다."
      onSave={onSave}
      saveState={saveState}
      list={<MediaList assets={assets} />}
    >
      <div className="grid gap-3 md:grid-cols-2">
        <SelectField
          label="범위"
          value={form.scope}
          onChange={(scope) => onChange({ ...form, scope, organizationId: scope === "landing" ? "" : form.organizationId })}
          options={["landing", "organization"]}
        />
        <AdminOrganizationSelect
          label="기관"
          value={form.organizationId}
          disabled={form.scope === "landing"}
          onChange={(organizationId) => onChange({ ...form, organizationId })}
          placeholder={form.scope === "landing" ? "랜딩 이미지는 기관을 선택하지 않습니다" : "기관명 또는 지역 검색"}
        />
        <Field label="라벨" value={form.label} onChange={(label) => onChange({ ...form, label })} placeholder="랜딩 히어로 이미지" />
        <Field label="사용 위치" value={form.usageSlot} onChange={(usageSlot) => onChange({ ...form, usageSlot })} placeholder="hero" />
        <SelectField label="상태" value={form.status} onChange={(status) => onChange({ ...form, status })} options={["draft", "published", "archived"]} />
        <Field label="이미지 URL" value={form.url} onChange={(url) => onChange({ ...form, url })} placeholder="https://..." />
        <Field label="대체 텍스트" value={form.altText} onChange={(altText) => onChange({ ...form, altText })} placeholder="아이들이 교실에서 활동하는 사진" />
      </div>
      <div className="rounded border border-line bg-surface p-3">
        <label className="grid gap-2 text-sm font-semibold text-ink">
          이미지 파일 업로드
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="rounded border border-line bg-white px-3 py-2 text-sm"
          />
        </label>
        <button
          type="button"
          onClick={() => void uploadMedia()}
          disabled={uploadState === "saving" || !file}
          className="mt-3 inline-flex min-h-10 items-center justify-center gap-2 rounded border border-line bg-white px-3 text-sm font-semibold text-muted hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:text-muted"
        >
          {uploadState === "saving" ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <ImageIcon size={16} aria-hidden />}
          업로드 후 URL 반영
        </button>
        {uploadMessage ? (
          <p className={`mt-2 text-sm font-semibold ${uploadState === "error" ? "text-coral" : "text-brand"}`}>
            {uploadMessage}
          </p>
        ) : null}
      </div>
    </EditorLayout>
  );
}

function AttendancePanel() {
  const [scope, setScope] = useState(defaultAttendanceForm);
  const [roster, setRoster] = useState<AttendanceRoster | null>(null);
  const [newChildName, setNewChildName] = useState("");
  const [actionState, setActionState] = useState<SaveState>("idle");
  const [statusMessage, setStatusMessage] = useState("기관, 날짜, 반을 선택해 출석부를 조회하세요.");

  const canLoad = Boolean(scope.organizationId && scope.attendanceDate && scope.className.trim());

  async function loadRoster() {
    if (!canLoad) {
      setStatusMessage("기관, 날짜, 반을 모두 입력해 주세요.");
      return;
    }

    setActionState("saving");
    const params = new URLSearchParams({
      organizationId: scope.organizationId,
      attendanceDate: scope.attendanceDate,
      className: scope.className.trim()
    });
    const response = await authenticatedFetch(`/api/admin/attendance?${params}`);
    if (!response.ok) {
      setActionState("error");
      setStatusMessage("출석부를 불러오지 못했습니다.");
      return;
    }

    setRoster(unwrapData<AttendanceRoster>(await response.json()));
    setActionState("idle");
    setStatusMessage("출석부를 불러왔습니다.");
  }

  function updateRosterItem(index: number, patch: Partial<AttendanceRosterItem>) {
    setRoster((current) =>
      current
        ? {
            ...current,
            roster: current.roster.map((item, itemIndex) =>
              itemIndex === index ? { ...item, ...patch } : item
            )
          }
        : current
    );
  }

  function addChild() {
    const childName = newChildName.trim();
    if (!childName || !roster || roster.roster.some((item) => item.childName === childName)) return;
    setRoster({
      ...roster,
      roster: [
        ...roster.roster,
        { id: null, childName, status: "present", note: "", updatedAt: null }
      ]
    });
    setNewChildName("");
  }

  async function saveRoster() {
    if (!roster || roster.roster.length === 0) return;
    setActionState("saving");
    const response = await authenticatedFetch("/api/admin/attendance", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationId: roster.organizationId,
        attendanceDate: roster.attendanceDate,
        className: roster.className,
        records: roster.roster.map(({ childName, status, note }) => ({ childName, status, note }))
      })
    });
    if (!response.ok) {
      setActionState("error");
      setStatusMessage("출석 저장에 실패했습니다. 마감 여부와 입력값을 확인해 주세요.");
      return;
    }
    const data = unwrapData<{ roster: AttendanceRoster }>(await response.json());
    setRoster(data.roster);
    setActionState("saved");
    setStatusMessage(`${data.roster.roster.length}명의 출석을 저장했습니다.`);
  }

  async function changeClosure(action: "close" | "reopen") {
    if (!roster) return;
    setActionState("saving");
    const response = await authenticatedFetch("/api/admin/attendance/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationId: roster.organizationId,
        attendanceDate: roster.attendanceDate,
        className: roster.className,
        action
      })
    });
    if (!response.ok) {
      setActionState("error");
      setStatusMessage("출석부 상태를 변경하지 못했습니다.");
      return;
    }
    const data = unwrapData<{ isClosed: boolean; closedAt: string | null }>(await response.json());
    setRoster({ ...roster, isClosed: data.isClosed, closedAt: data.closedAt });
    setActionState("saved");
    setStatusMessage(data.isClosed ? "출석부를 마감했습니다." : "출석부를 재오픈했습니다.");
  }

  return (
    <div className="grid gap-5">
      <section className="rounded border border-line bg-white p-5 shadow-soft">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <h2 className="text-2xl font-semibold tracking-normal">출석체크 관리</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              기관·날짜·반별 출석부를 불러와 일괄 저장하고 마감 상태를 관리합니다.
            </p>
          </div>
          {roster ? <Badge tone={roster.isClosed ? "amber" : "green"}>{roster.isClosed ? "마감됨" : "작성 중"}</Badge> : null}
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <AdminOrganizationSelect
            value={scope.organizationId}
            required
            onChange={(organizationId) => setScope({ ...scope, organizationId })}
          />
          <Field label="날짜" value={scope.attendanceDate} onChange={(attendanceDate) => setScope({ ...scope, attendanceDate })} placeholder="2026-06-24" />
          <Field label="반" value={scope.className} onChange={(className) => setScope({ ...scope, className })} placeholder="햇님반" />
        </div>
        <button
          type="button"
          onClick={() => void loadRoster()}
          disabled={!canLoad || actionState === "saving"}
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded border border-line bg-white px-4 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:text-muted"
        >
          <RefreshCw size={17} className={actionState === "saving" ? "animate-spin" : ""} aria-hidden />
          출석부 조회
        </button>
        <p className="mt-4 rounded border border-line bg-surface px-3 py-2 text-sm font-semibold text-muted">
          {statusMessage}
        </p>
      </section>

      {roster ? (
        <section className="rounded border border-line bg-white p-5 shadow-soft">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-lg font-semibold text-ink">{roster.className} 출석부</h3>
              <p className="mt-1 text-sm text-muted">{roster.attendanceDate} · {roster.roster.length}명</p>
            </div>
            <button
              type="button"
              onClick={() => void changeClosure(roster.isClosed ? "reopen" : "close")}
              disabled={actionState === "saving"}
              className="inline-flex min-h-10 items-center justify-center rounded border border-line bg-white px-3 text-sm font-semibold text-muted hover:border-brand hover:text-brand"
            >
              {roster.isClosed ? "재오픈" : "출석부 마감"}
            </button>
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <input
              value={newChildName}
              onChange={(event) => setNewChildName(event.target.value)}
              disabled={roster.isClosed}
              placeholder="원아명 추가"
              className="min-h-11 flex-1 rounded border border-line bg-surface px-3 text-sm outline-none focus:border-brand"
            />
            <button
              type="button"
              onClick={addChild}
              disabled={roster.isClosed || !newChildName.trim()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded border border-line bg-white px-4 text-sm font-semibold disabled:text-muted"
            >
              <Plus size={17} aria-hidden />
              원아 추가
            </button>
          </div>

          <div className="mt-4 grid gap-3">
            {roster.roster.map((item, index) => (
              <div key={item.childName} className="grid gap-3 rounded border border-line bg-surface p-3 md:grid-cols-[minmax(120px,1fr)_180px_2fr] md:items-center">
                <p className="font-semibold text-ink">{item.childName}</p>
                <select
                  value={item.status}
                  disabled={roster.isClosed}
                  onChange={(event) => updateRosterItem(index, { status: event.target.value as AttendanceRosterItem["status"] })}
                  className="min-h-10 rounded border border-line bg-white px-3 text-sm"
                >
                  <option value="present">출석</option>
                  <option value="absent">결석</option>
                  <option value="late">지각</option>
                  <option value="excused">인정결석</option>
                </select>
                <input
                  value={item.note}
                  disabled={roster.isClosed}
                  onChange={(event) => updateRosterItem(index, { note: event.target.value })}
                  placeholder="메모"
                  className="min-h-10 rounded border border-line bg-white px-3 text-sm"
                />
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => void saveRoster()}
            disabled={roster.isClosed || roster.roster.length === 0 || actionState === "saving"}
            className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded bg-brand px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {actionState === "saving" ? <Loader2 size={17} className="animate-spin" aria-hidden /> : <Save size={17} aria-hidden />}
            출석 일괄 저장
          </button>
        </section>
      ) : null}
    </div>
  );
}

function GiftPanel({
  codes,
  staffCoupons,
  form,
  staffCouponForm,
  onChange,
  onStaffCouponChange,
  onSave,
  onStaffCouponSave,
  onStaffCouponEdit,
  saveState
}: {
  codes: AdminGiftCode[];
  staffCoupons: AdminStaffCoupon[];
  form: typeof defaultGiftForm;
  staffCouponForm: typeof defaultStaffCouponForm;
  onChange: (form: typeof defaultGiftForm) => void;
  onStaffCouponChange: (form: typeof defaultStaffCouponForm) => void;
  onSave: () => void;
  onStaffCouponSave: () => void;
  onStaffCouponEdit: (form: typeof defaultStaffCouponForm) => void;
  saveState: SaveState;
}) {
  return (
    <div className="grid gap-5">
      <EditorLayout
        title="교직원 쿠폰함 코드"
        description="여기서 등록한 쿠폰은 해당 기관의 /app 점보키즈 쿠폰함에 바로 노출됩니다."
        onSave={onStaffCouponSave}
        saveState={saveState}
        list={
          <StaffCouponList
            coupons={staffCoupons}
            onEdit={(coupon) => onStaffCouponEdit(toStaffCouponForm(coupon))}
          />
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <AdminOrganizationSelect label="기관" value={staffCouponForm.organizationId} required onChange={(organizationId) => onStaffCouponChange({ ...staffCouponForm, organizationId })} />
          <Field label="제목" value={staffCouponForm.title} onChange={(title) => onStaffCouponChange({ ...staffCouponForm, title })} placeholder="원장님 포토북 제작 20% 할인" />
          <Field label="설명" value={staffCouponForm.description} onChange={(description) => onStaffCouponChange({ ...staffCouponForm, description })} placeholder="쿠폰함에 표시될 설명" />
          <Field label="코드" value={staffCouponForm.code} onChange={(code) => onStaffCouponChange({ ...staffCouponForm, code })} placeholder="JK-DIRECTOR-20" />
          <Field label="혜택 라벨" value={staffCouponForm.amountLabel} onChange={(amountLabel) => onStaffCouponChange({ ...staffCouponForm, amountLabel })} placeholder="20% 할인" />
          <Field label="유효기간" value={staffCouponForm.validUntil} onChange={(validUntil) => onStaffCouponChange({ ...staffCouponForm, validUntil })} placeholder="2026-12-31" />
          <SelectField label="대상" value={staffCouponForm.assignedTo} onChange={(assignedTo) => onStaffCouponChange({ ...staffCouponForm, assignedTo })} options={["all_staff", "owner", "teacher"]} />
          <SelectField label="상태" value={staffCouponForm.status} onChange={(status) => onStaffCouponChange({ ...staffCouponForm, status })} options={["available", "downloaded", "used", "expired"]} />
          <Field label="사용 사이트" value={staffCouponForm.sites} onChange={(sites) => onStaffCouponChange({ ...staffCouponForm, sites })} placeholder="jumbokids,godomall" />
          <Field label="점보키즈 URL" value={staffCouponForm.jumbokidsUrl} onChange={(jumbokidsUrl) => onStaffCouponChange({ ...staffCouponForm, jumbokidsUrl })} placeholder="https://..." />
          <Field label="고도몰 URL" value={staffCouponForm.godomallUrl} onChange={(godomallUrl) => onStaffCouponChange({ ...staffCouponForm, godomallUrl })} placeholder="https://..." />
        </div>
      </EditorLayout>

      <EditorLayout
        title="상품권 코드 재고"
        description="지급 전/후 상태를 추적하는 내부 코드 재고입니다. 쿠폰함 노출은 위 교직원 쿠폰함 코드를 사용합니다."
        onSave={onSave}
        saveState={saveState}
        list={<RecordList emptyLabel="등록된 상품권/코드가 없습니다." items={codes.map((code) => `${code.title} · ${code.code} · ${code.status}`)} />}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <AdminOrganizationSelect label="기관" value={form.organizationId} onChange={(organizationId) => onChange({ ...form, organizationId })} />
          <Field label="제목" value={form.title} onChange={(title) => onChange({ ...form, title })} placeholder="점보키즈 포토북 상품권" />
          <Field label="코드" value={form.code} onChange={(code) => onChange({ ...form, code })} placeholder="JK-GIFT-0001" />
          <Field label="혜택 라벨" value={form.amountLabel} onChange={(amountLabel) => onChange({ ...form, amountLabel })} placeholder="10,000원" />
          <SelectField label="상태" value={form.status} onChange={(status) => onChange({ ...form, status })} options={["available", "issued", "redeemed", "expired", "void"]} />
          <Field label="만료 시각" value={form.expiresAt} onChange={(expiresAt) => onChange({ ...form, expiresAt })} placeholder="2026-12-31T14:59:59.000Z" />
        </div>
      </EditorLayout>
    </div>
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
  const [sendState, setSendState] = useState<Record<string, SaveState>>({});
  const [deliveryLog, setDeliveryLog] = useState<PushDeliveryLog | null>(null);
  const [deliveryLogState, setDeliveryLogState] = useState<SaveState>("idle");
  const [activeDeliveryCampaignId, setActiveDeliveryCampaignId] = useState<string | null>(null);
  const [sendMessage, setSendMessage] = useState("");

  async function loadDeliveryLog(campaign: AdminPushCampaign) {
    setActiveDeliveryCampaignId(campaign.id);
    setDeliveryLogState("saving");
    const response = await authenticatedFetch(`/api/admin/push/campaigns/${campaign.id}/deliveries?limit=20`);

    if (!response.ok) {
      setDeliveryLogState("error");
      setSendMessage("푸시 발송 이력을 불러오지 못했습니다.");
      return;
    }

    setDeliveryLog(unwrapData<PushDeliveryLog>(await response.json()));
    setDeliveryLogState("saved");
    setSendMessage(`${campaign.title} 발송 이력을 불러왔습니다.`);
  }

  async function sendCampaign(campaign: AdminPushCampaign) {
    setSendState((current) => ({ ...current, [campaign.id]: "saving" }));
    setSendMessage("");
    const response = await authenticatedFetch(`/api/admin/push/campaigns/${campaign.id}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerMode: "mock", mockResult: "sent" })
    });

    if (!response.ok) {
      setSendState((current) => ({ ...current, [campaign.id]: "error" }));
      setSendMessage("푸시 발송 요청에 실패했습니다.");
      return;
    }

    const result = unwrapData<{ sent: number; skipped: number }>(await response.json());
    setSendState((current) => ({ ...current, [campaign.id]: "saved" }));
    setSendMessage(`발송 요청 완료: 전송 ${result.sent}건, 제외 ${result.skipped}건`);
    await loadDeliveryLog(campaign);
  }

  return (
    <EditorLayout
      title="푸시알림/운영 메시지"
      description="대상 기관/역할, 예약 시간, 제목과 본문을 지정해 운영 알림 캠페인을 준비합니다."
      onSave={onSave}
      saveState={saveState}
      list={
        <PushCampaignList
          campaigns={campaigns}
          sendState={sendState}
          deliveryLogState={deliveryLogState}
          activeDeliveryCampaignId={activeDeliveryCampaignId}
          onSend={sendCampaign}
          onLoadDeliveryLog={loadDeliveryLog}
        />
      }
    >
      <div className="grid gap-3 md:grid-cols-2">
        <AdminOrganizationSelect label="기관" value={form.organizationId} onChange={(organizationId) => onChange({ ...form, organizationId })} />
        <Field label="제목" value={form.title} onChange={(title) => onChange({ ...form, title })} placeholder="내일 행사 안내" />
        <SelectField label="대상 역할" value={form.targetRole} onChange={(targetRole) => onChange({ ...form, targetRole })} options={["", "owner", "manager", "teacher"]} />
        <SelectField label="상태" value={form.status} onChange={(status) => onChange({ ...form, status })} options={["draft", "scheduled", "sent", "failed", "cancelled"]} />
        <Field label="예약 시각" value={form.scheduledFor} onChange={(scheduledFor) => onChange({ ...form, scheduledFor })} placeholder="2026-06-23T00:00:00.000Z" />
      </div>
      <TextArea label="본문" value={form.body} onChange={(body) => onChange({ ...form, body })} placeholder="알림 본문" />
      {sendMessage ? <p className="text-sm font-semibold text-brand">{sendMessage}</p> : null}
      <PushDeliveryLogPanel log={deliveryLog} state={deliveryLogState} />
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

function PushCampaignList({
  campaigns,
  sendState,
  deliveryLogState,
  activeDeliveryCampaignId,
  onSend,
  onLoadDeliveryLog
}: {
  campaigns: AdminPushCampaign[];
  sendState: Record<string, SaveState>;
  deliveryLogState: SaveState;
  activeDeliveryCampaignId: string | null;
  onSend: (campaign: AdminPushCampaign) => void;
  onLoadDeliveryLog: (campaign: AdminPushCampaign) => void;
}) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-ink">현재 캠페인</h3>
      <div className="mt-4 grid gap-3">
        {campaigns.length > 0 ? (
          campaigns.map((campaign) => {
            const state = sendState[campaign.id] ?? "idle";
            const canSend = campaign.status === "draft" || campaign.status === "scheduled";
            return (
              <div key={campaign.id} className="rounded border border-line bg-surface p-3">
                <p className="font-semibold text-ink">{campaign.title}</p>
                <p className="mt-1 text-xs font-semibold text-brand">
                  {campaign.status} · {campaign.scheduledFor ?? "즉시"} · {campaign.targetRole ?? "전체"}
                </p>
                <button
                  type="button"
                  onClick={() => onSend(campaign)}
                  disabled={!canSend || state === "saving"}
                  className="mt-3 inline-flex min-h-9 items-center justify-center gap-2 rounded border border-line bg-white px-3 text-xs font-semibold text-muted hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:text-muted"
                >
                  {state === "saving" ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <Send size={15} aria-hidden />}
                  {canSend ? "발송 요청" : "발송 불가"}
                </button>
                <button
                  type="button"
                  onClick={() => onLoadDeliveryLog(campaign)}
                  disabled={deliveryLogState === "saving" && activeDeliveryCampaignId === campaign.id}
                  className="mt-2 inline-flex min-h-9 items-center justify-center gap-2 rounded border border-line bg-white px-3 text-xs font-semibold text-muted hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:text-muted"
                >
                  {deliveryLogState === "saving" && activeDeliveryCampaignId === campaign.id ? (
                    <Loader2 size={15} className="animate-spin" aria-hidden />
                  ) : (
                    <RefreshCw size={15} aria-hidden />
                  )}
                  이력 보기
                </button>
              </div>
            );
          })
        ) : (
          <p className="rounded border border-dashed border-line bg-surface p-4 text-sm text-muted">
            등록된 푸시 캠페인이 없습니다.
          </p>
        )}
      </div>
    </div>
  );
}

function PushDeliveryLogPanel({ log, state }: { log: PushDeliveryLog | null; state: SaveState }) {
  if (state === "saving") {
    return (
      <div className="rounded border border-line bg-surface p-4 text-sm font-semibold text-muted">
        <Loader2 size={16} className="mr-2 inline animate-spin" aria-hidden />
        발송 이력을 불러오는 중입니다.
      </div>
    );
  }

  if (!log) {
    return (
      <div className="rounded border border-dashed border-line bg-surface p-4 text-sm text-muted">
        캠페인 카드에서 이력 보기를 선택하면 최근 delivery log가 표시됩니다.
      </div>
    );
  }

  return (
    <section className="rounded border border-line bg-surface p-4">
      <div className="flex flex-wrap gap-2">
        <Badge tone="blue">총 {log.summary.total}건</Badge>
        <Badge tone="green">전송 {log.summary.sent}건</Badge>
        <Badge tone="amber">제외 {log.summary.skipped}건</Badge>
        <Badge tone={log.summary.failed > 0 ? "red" : "blue"}>실패 {log.summary.failed}건</Badge>
      </div>
      <div className="mt-4 grid gap-2">
        {log.deliveries.length > 0 ? (
          log.deliveries.map((delivery) => (
            <div key={delivery.id ?? `${delivery.recipientProfileId}-${delivery.createdAt}`} className="rounded border border-line bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-xs font-semibold text-muted">{delivery.recipientProfileId}</p>
                <Badge tone={delivery.status === "sent" ? "green" : delivery.status === "failed" ? "red" : "amber"}>
                  {delivery.status}
                </Badge>
              </div>
              <p className="mt-2 text-xs font-semibold text-brand">
                {delivery.provider} · {delivery.recipientRole} · {delivery.createdAt}
              </p>
              {delivery.skippedReason || delivery.failureReason ? (
                <p className="mt-1 text-xs text-muted">
                  {delivery.skippedReason ?? delivery.failureReason}
                </p>
              ) : null}
            </div>
          ))
        ) : (
          <p className="rounded border border-dashed border-line bg-white p-4 text-sm text-muted">
            아직 저장된 발송 이력이 없습니다.
          </p>
        )}
      </div>
    </section>
  );
}

function StaffCouponList({
  coupons,
  onEdit
}: {
  coupons: AdminStaffCoupon[];
  onEdit: (coupon: AdminStaffCoupon) => void;
}) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-ink">쿠폰함 노출 코드</h3>
      <div className="mt-4 grid gap-3">
        {coupons.length > 0 ? (
          coupons.map((coupon) => (
            <div key={coupon.id} className="rounded border border-line bg-surface p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-wrap-anywhere font-semibold text-ink">{coupon.title}</p>
                  <p className="mt-1 break-all font-mono text-xs font-semibold text-muted">
                    {coupon.code}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-brand">
                    {coupon.amountLabel} · {coupon.assignedTo} · {coupon.status}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {coupon.organizationId} · {coupon.validUntil}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onEdit(coupon)}
                  className="shrink-0 rounded border border-line bg-white px-3 py-2 text-xs font-semibold text-muted transition hover:border-brand hover:text-brand"
                >
                  수정
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="rounded border border-dashed border-line bg-surface p-4 text-sm text-muted">
            쿠폰함에 노출할 코드가 없습니다.
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

function serializeStaffCouponForm(form: typeof defaultStaffCouponForm) {
  return {
    ...form,
    id: form.id || undefined,
    sites: parseCouponSites(form.sites)
  };
}

function toStaffCouponForm(coupon: AdminStaffCoupon): typeof defaultStaffCouponForm {
  return {
    id: coupon.id,
    organizationId: coupon.organizationId,
    title: coupon.title,
    description: coupon.description,
    code: coupon.code,
    amountLabel: coupon.amountLabel,
    validUntil: coupon.validUntil,
    assignedTo: coupon.assignedTo,
    status: coupon.status,
    sites: coupon.sites.join(","),
    jumbokidsUrl: coupon.jumbokidsUrl,
    godomallUrl: coupon.godomallUrl
  };
}

function parseCouponSites(value: string) {
  const sites = value
    .split(",")
    .map((site) => site.trim())
    .filter((site): site is "jumbokids" | "godomall" => site === "jumbokids" || site === "godomall");

  return sites.length > 0 ? sites : ["jumbokids"];
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

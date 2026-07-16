"use client";

import {
  Bell,
  FileText,
  Gift,
  Image as ImageIcon,
  Loader2,
  LockKeyhole,
  Plus,
  RefreshCw,
  Send,
  Save,
  ShieldCheck,
  Trash2,
  UserPlus
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AdminOrganizationSelect } from "@/components/admin-organization-select";
import { Badge } from "@/components/badge";
import { authenticatedFetch } from "@/lib/auth-fetch";
import type {
  AdminContentBlock,
  AdminGiftCode,
  AdminMediaAsset,
  AdminOperationsPayload,
  AdminPushCampaign,
  AdminStaffCoupon
} from "@/lib/admin-operations";
import type { AdminInvite, AdminInviteRemovalResult } from "@/lib/admin-invites";
import type { PushDeliveryLog } from "@/lib/push-operations";

type AdminTab = "content" | "media" | "invites" | "gifts" | "push" | "audit";
type SaveState = "idle" | "saving" | "saved" | "error";

const tabs: Array<{ id: AdminTab; label: string; icon: typeof FileText }> = [
  { id: "content", label: "콘텐츠", icon: FileText },
  { id: "media", label: "이미지", icon: ImageIcon },
  { id: "invites", label: "초대", icon: UserPlus },
  { id: "gifts", label: "상품권/코드", icon: Gift },
  { id: "push", label: "푸시알림", icon: Bell },
  { id: "audit", label: "감사로그", icon: ShieldCheck }
];

const emptyPayload: AdminOperationsPayload = {
  contentBlocks: [],
  mediaAssets: [],
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

const defaultLandingSettings = {
  heroId: "",
  appearanceId: "",
  title: "행사는 놓치지 않고, 안내문은 더 따뜻하게.",
  body: "키즈메모는 원장님이 행사 일정을 정리하고, 학부모님께 보낼 안내문 초안을 바로 준비할 수 있도록 돕습니다.",
  imageUrl: "",
  ctaLabel: "내 기관 시작하기",
  ctaUrl: "/signup",
  titleStyle: "soft",
  titleSize: "large",
  overlayTone: "dark"
};

const defaultMediaForm = {
  id: "",
  scope: "landing",
  organizationId: "",
  label: "",
  url: "",
  altText: "",
  usageSlot: "",
  status: "draft"
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

const defaultInviteForm = {
  organizationId: "",
  role: "teacher",
  code: "",
  expiresAt: "",
  maxUses: ""
};

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>("content");
  const [payload, setPayload] = useState<AdminOperationsPayload>(emptyPayload);
  const [invites, setInvites] = useState<AdminInvite[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "denied">("loading");
  const [message, setMessage] = useState("운영 콘솔 권한을 확인하고 있습니다.");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [inviteState, setInviteState] = useState<SaveState>("idle");
  const [contentForm, setContentForm] = useState(defaultContentForm);
  const [landingSettings, setLandingSettings] = useState(defaultLandingSettings);
  const [mediaForm, setMediaForm] = useState(defaultMediaForm);
  const [giftForm, setGiftForm] = useState(defaultGiftForm);
  const [staffCouponForm, setStaffCouponForm] = useState(defaultStaffCouponForm);
  const [pushForm, setPushForm] = useState(defaultPushForm);
  const [inviteForm, setInviteForm] = useState(defaultInviteForm);

  useEffect(() => {
    void loadOperations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setLandingSettings(toLandingSettings(data.contentBlocks));
    setLoadState("ready");
    setMessage("운영 콘솔이 live 관리자 세션으로 연결되었습니다.");
    await loadInvites();
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

  async function saveLandingSettings() {
    setSaveState("saving");
    const appearancePayload = {
      id: landingSettings.appearanceId || undefined,
      scope: "landing",
      organizationId: null,
      slot: "landing-appearance",
      title: landingSettings.titleStyle,
      body: JSON.stringify({ titleSize: landingSettings.titleSize, overlayTone: landingSettings.overlayTone }),
      imageUrl: "",
      ctaLabel: "",
      ctaUrl: "",
      sortOrder: 1,
      status: "published"
    };
    const heroPayload = {
      id: landingSettings.heroId || undefined,
      scope: "landing",
      organizationId: null,
      slot: "hero",
      title: landingSettings.title,
      body: landingSettings.body,
      imageUrl: landingSettings.imageUrl,
      ctaLabel: landingSettings.ctaLabel,
      ctaUrl: landingSettings.ctaUrl,
      sortOrder: 0,
      status: "published"
    };

    const responses = await Promise.all(
      [heroPayload, appearancePayload].map((payload) =>
        authenticatedFetch("/api/admin/operations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resource: "contentBlocks", payload })
        })
      )
    );

    if (responses.some((response) => !response.ok)) {
      setSaveState("error");
      setMessage("랜딩 설정 저장에 실패했습니다. 관리자 권한과 입력값을 확인해 주세요.");
      return;
    }

    setSaveState("saved");
    setMessage("랜딩 사진, 문구, 타이포그래피 설정을 게시했습니다.");
    await loadOperations();
  }

  async function loadInvites() {
    const response = await authenticatedFetch("/api/admin/invites");
    if (!response.ok) {
      setInvites([]);
      setMessage("초대 목록을 불러오지 못했습니다. 관리자 권한을 확인해 주세요.");
      return;
    }

    setInvites(unwrapData<{ invites: AdminInvite[] }>(await response.json()).invites);
  }

  async function createInvite() {
    setInviteState("saving");
    const response = await authenticatedFetch("/api/admin/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(normalizePayload(serializeInviteForm(inviteForm)))
    });

    if (!response.ok) {
      setInviteState("error");
      setMessage("초대 생성에 실패했습니다. 기관, 권한, 코드 중복 여부를 확인해 주세요.");
      return;
    }

    const invite = unwrapData<AdminInvite>(await response.json());
    setInvites((current) => [invite, ...current.filter((item) => item.id !== invite.id)]);
    setInviteForm(defaultInviteForm);
    setInviteState("saved");
    setMessage(`초대 코드 ${invite.code}를 생성했습니다.`);
  }

  async function removeInvite(invite: AdminInvite) {
    setInviteState("saving");
    const response = await authenticatedFetch(`/api/admin/invites?id=${encodeURIComponent(invite.id)}`, {
      method: "DELETE"
    });

    if (!response.ok) {
      setInviteState("error");
      setMessage("초대 삭제/회수에 실패했습니다.");
      return;
    }

    const result = unwrapData<AdminInviteRemovalResult>(await response.json());
    setInviteState("saved");
    setMessage(result.action === "deleted" ? "미사용 초대를 삭제했습니다." : "사용 이력이 있는 초대를 회수했습니다.");
    await loadInvites();
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
                랜딩 콘텐츠, 기관별 이미지, 상품권/쿠폰 코드, 푸시알림을 관리하는
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
            <section className="mt-5 grid gap-3 md:grid-cols-6">
              <Metric label="게시 랜딩" value={`${publishedLandingCount}개`} />
              <Metric label="이미지" value={`${payload.mediaAssets.length}개`} />
              <Metric label="활성 초대" value={`${invites.filter((invite) => getInviteStatus(invite).status === "active").length}개`} />
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
                      landingSettings={landingSettings}
                      onLandingSettingsChange={setLandingSettings}
                      onLandingSave={() => void saveLandingSettings()}
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
                  {activeTab === "invites" ? (
                    <InvitePanel
                      invites={invites}
                      form={inviteForm}
                      onChange={setInviteForm}
                      onCreate={() => void createInvite()}
                      onRemove={(invite) => void removeInvite(invite)}
                      saveState={inviteState}
                    />
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
  landingSettings,
  onLandingSettingsChange,
  onLandingSave,
  saveState
}: {
  blocks: AdminContentBlock[];
  form: typeof defaultContentForm;
  onChange: (form: typeof defaultContentForm) => void;
  onSave: () => void;
  landingSettings: typeof defaultLandingSettings;
  onLandingSettingsChange: (settings: typeof defaultLandingSettings) => void;
  onLandingSave: () => void;
  saveState: SaveState;
}) {
  return (
    <div className="grid gap-5">
      <LandingSettingsPanel
        settings={landingSettings}
        onChange={onLandingSettingsChange}
        onSave={onLandingSave}
        saveState={saveState}
      />
      <EditorLayout
        title="기타 사이트/기관 콘텐츠"
        description="랜딩의 기능 카드, 기관별 소개 문구 등 추가 콘텐츠 슬롯을 관리합니다."
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
    </div>
  );
}

function LandingSettingsPanel({
  settings,
  onChange,
  onSave,
  saveState
}: {
  settings: typeof defaultLandingSettings;
  onChange: (settings: typeof defaultLandingSettings) => void;
  onSave: () => void;
  saveState: SaveState;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-[#fffefa] shadow-soft">
      <div className="relative min-h-44 overflow-hidden bg-ink p-5 text-white sm:p-6">
        {settings.imageUrl ? <div className="absolute inset-0 bg-cover bg-center opacity-35" style={{ backgroundImage: `url(${settings.imageUrl})` }} /> : null}
        <div className="relative max-w-2xl">
          <p className="text-sm font-semibold text-white/82">랜딩 첫 화면 설정</p>
          <h2 className="mt-1 text-2xl font-semibold">사진, 문구, 타이포그래피를 한 번에 편집합니다.</h2>
          <p className="mt-2 text-sm leading-6 text-white/84">이미지 탭에서 업로드한 사진의 URL을 붙여 넣고 게시하면 즉시 랜딩 히어로에 반영됩니다.</p>
        </div>
      </div>
      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_280px] sm:p-6">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="메인 제목" value={settings.title} onChange={(title) => onChange({ ...settings, title })} placeholder="랜딩 메인 제목" />
          <Field label="대표 사진 URL" value={settings.imageUrl} onChange={(imageUrl) => onChange({ ...settings, imageUrl })} placeholder="이미지 탭에서 업로드한 URL" />
          <Field label="버튼 문구" value={settings.ctaLabel} onChange={(ctaLabel) => onChange({ ...settings, ctaLabel })} placeholder="내 기관 시작하기" />
          <Field label="버튼 링크" value={settings.ctaUrl} onChange={(ctaUrl) => onChange({ ...settings, ctaUrl })} placeholder="/signup" />
          <SelectField label="제목 스타일" value={settings.titleStyle} onChange={(titleStyle) => onChange({ ...settings, titleStyle })} options={["soft", "clear", "editorial"]} />
          <SelectField label="제목 크기" value={settings.titleSize} onChange={(titleSize) => onChange({ ...settings, titleSize })} options={["standard", "large"]} />
          <SelectField label="사진 위 글자 대비" value={settings.overlayTone} onChange={(overlayTone) => onChange({ ...settings, overlayTone })} options={["dark", "calm", "strong"]} />
          <div className="flex items-end"><button type="button" onClick={onSave} disabled={saveState === "saving"} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-brand px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"><Save size={17} aria-hidden />{saveState === "saving" ? "게시 중" : "랜딩 설정 게시"}</button></div>
          <div className="md:col-span-2"><TextArea label="소개 문구" value={settings.body} onChange={(body) => onChange({ ...settings, body })} placeholder="메인 제목 아래에 보일 소개 문구" /></div>
        </div>
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          <div className="h-36 bg-ink bg-cover bg-center" style={settings.imageUrl ? { backgroundImage: `url(${settings.imageUrl})` } : undefined} />
          <div className="p-4"><p className="text-xs font-semibold text-brand">미리보기</p><p className="mt-2 font-semibold text-ink">{settings.title || "메인 제목"}</p><p className="mt-2 text-sm leading-6 text-muted">{settings.body || "소개 문구가 이 위치에 표시됩니다."}</p><span className="mt-3 inline-flex rounded-full bg-brand px-3 py-2 text-xs font-semibold text-white">{settings.ctaLabel || "버튼 문구"}</span></div>
        </div>
      </div>
    </section>
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

    const result = unwrapData<{ mediaAssetId: string | null; publicUrl: string }>(await response.json());
    onChange({
      ...form,
      id: result.mediaAssetId || form.id,
      url: result.publicUrl,
      label: form.label || file.name
    });
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

function InvitePanel({
  invites,
  form,
  onChange,
  onCreate,
  onRemove,
  saveState
}: {
  invites: AdminInvite[];
  form: typeof defaultInviteForm;
  onChange: (form: typeof defaultInviteForm) => void;
  onCreate: () => void;
  onRemove: (invite: AdminInvite) => void;
  saveState: SaveState;
}) {
  return (
    <EditorLayout
      title="온보딩 초대 관리"
      description="기관별 원감/선생님 가입 초대 코드를 만들고, 미사용 초대는 삭제하거나 사용 이력이 있는 초대는 회수합니다."
      onSave={onCreate}
      saveState={saveState}
      list={<InviteList invites={invites} onRemove={onRemove} saveState={saveState} />}
    >
      <div className="grid gap-3 md:grid-cols-2">
        <AdminOrganizationSelect
          label="기관"
          value={form.organizationId}
          required
          onChange={(organizationId) => onChange({ ...form, organizationId })}
          placeholder="초대를 발급할 기관 검색"
        />
        <SelectField
          label="역할"
          value={form.role}
          onChange={(role) => onChange({ ...form, role })}
          options={["teacher", "manager"]}
        />
        <Field
          label="초대 코드"
          value={form.code}
          onChange={(code) => onChange({ ...form, code })}
          placeholder="비워두면 자동 생성"
        />
        <Field
          label="최대 사용 수"
          value={form.maxUses}
          onChange={(maxUses) => onChange({ ...form, maxUses })}
          placeholder="비워두면 제한 없음"
        />
        <Field
          label="만료 시각"
          value={form.expiresAt}
          onChange={(expiresAt) => onChange({ ...form, expiresAt })}
          placeholder="2026-12-31T14:59:59.000Z"
        />
      </div>
    </EditorLayout>
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

function InviteList({
  invites,
  onRemove,
  saveState
}: {
  invites: AdminInvite[];
  onRemove: (invite: AdminInvite) => void;
  saveState: SaveState;
}) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-ink">초대 코드</h3>
      <div className="mt-4 grid gap-3">
        {invites.length > 0 ? (
          invites.map((invite) => {
            const status = getInviteStatus(invite);
            return (
              <div key={invite.id} className="rounded border border-line bg-surface p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-all font-mono text-sm font-semibold text-ink">{invite.code}</p>
                    <p className="mt-1 text-sm font-semibold text-muted">
                      {invite.organizationName || invite.organizationId}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {invite.organizationRegion || "지역 없음"} · {invite.role}
                    </p>
                  </div>
                  <Badge tone={status.tone}>{status.label}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-muted">
                  <span>사용 {invite.usedCount}{invite.maxUses ? `/${invite.maxUses}` : ""}</span>
                  <span>생성 {formatDateTime(invite.createdAt)}</span>
                  {invite.expiresAt ? <span>만료 {formatDateTime(invite.expiresAt)}</span> : null}
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(invite)}
                  disabled={saveState === "saving" || Boolean(invite.revokedAt)}
                  className="mt-3 inline-flex min-h-9 items-center justify-center gap-2 rounded border border-line bg-white px-3 text-xs font-semibold text-muted hover:border-coral hover:text-coral disabled:cursor-not-allowed disabled:text-muted"
                >
                  {saveState === "saving" ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <Trash2 size={15} aria-hidden />}
                  {invite.usedCount > 0 ? "회수" : "삭제"}
                </button>
              </div>
            );
          })
        ) : (
          <p className="rounded border border-dashed border-line bg-surface p-4 text-sm text-muted">
            등록된 초대 코드가 없습니다.
          </p>
        )}
      </div>
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
    "maxUses",
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

function toLandingSettings(blocks: AdminContentBlock[]): typeof defaultLandingSettings {
  const hero = blocks.find((block) => block.scope === "landing" && block.slot === "hero");
  const appearance = blocks.find((block) => block.scope === "landing" && block.slot === "landing-appearance");
  const parsedAppearance = parseLandingAppearance(appearance?.body);

  return {
    heroId: hero?.id ?? "",
    appearanceId: appearance?.id ?? "",
    title: hero?.title || defaultLandingSettings.title,
    body: hero?.body || defaultLandingSettings.body,
    imageUrl: hero?.imageUrl || "",
    ctaLabel: hero?.ctaLabel || defaultLandingSettings.ctaLabel,
    ctaUrl: hero?.ctaUrl || defaultLandingSettings.ctaUrl,
    titleStyle: appearance?.title || defaultLandingSettings.titleStyle,
    titleSize: parsedAppearance.titleSize,
    overlayTone: parsedAppearance.overlayTone
  };
}

function parseLandingAppearance(value?: string) {
  try {
    const parsed = JSON.parse(value ?? "{}") as { titleSize?: string; overlayTone?: string };
    return {
      titleSize: parsed.titleSize === "standard" ? "standard" : "large",
      overlayTone: ["dark", "calm", "strong"].includes(parsed.overlayTone ?? "") ? parsed.overlayTone! : "dark"
    };
  } catch {
    return { titleSize: "large", overlayTone: "dark" };
  }
}

function serializeInviteForm(form: typeof defaultInviteForm) {
  return {
    organizationId: form.organizationId,
    role: form.role,
    code: form.code.trim() || undefined,
    expiresAt: form.expiresAt.trim() || null,
    maxUses: form.maxUses.trim() || null
  };
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

function getInviteStatus(invite: AdminInvite): {
  label: string;
  status: "active" | "expired" | "revoked" | "used";
  tone: "green" | "amber" | "red" | "blue" | "gray";
} {
  if (invite.revokedAt) {
    return { label: "회수됨", status: "revoked", tone: "gray" };
  }

  if (invite.expiresAt && new Date(invite.expiresAt).getTime() <= Date.now()) {
    return { label: "만료", status: "expired", tone: "amber" };
  }

  if (invite.maxUses !== null && invite.usedCount >= invite.maxUses) {
    return { label: "사용 완료", status: "used", tone: "blue" };
  }

  return { label: "활성", status: "active", tone: "green" };
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
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

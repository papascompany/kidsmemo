"use client";

import {
  Check,
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
  Loader2,
  Plus,
  Save,
  Users
} from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "./badge";
import {
  couponCampaigns as initialCampaigns,
  couponItems as initialItems,
  organizations,
  profiles
} from "@/lib/mock-data";
import { issueModeLabels, targetScopeLabels } from "@/lib/format";
import type {
  BenefitIssueMode,
  CouponCampaign,
  CouponItem,
  NoticeType,
  TargetScope
} from "@/lib/types";

type CampaignFormState = {
  name: string;
  description: string;
  issueMode: BenefitIssueMode;
  targetScope: TargetScope;
  validFrom: string;
  validUntil: string;
  noticeType: NoticeType;
  noticeHtml: string;
  noticeImageUrl: string;
  selectedOrganizationIds: string[];
  selectedProfileIds: string[];
};

type ItemDraft = {
  title: string;
  benefitType: "coupon" | "credit";
  amountLabel: string;
  manualCode: string;
  manualUrl: string;
  jumbokidsBenefitType: "discount_coupon" | "photo_credit" | "album_coupon";
};

const defaultCampaignForm: CampaignFormState = {
  name: "새 행사 쿠폰팩",
  description: "행사 전날 발송할 점보키즈 혜택 안내",
  issueMode: "manual",
  targetScope: "all_members",
  validFrom: "2026-06-01",
  validUntil: "2026-07-31",
  noticeType: "html",
  noticeHtml:
    "<h2>행사 사진 혜택 안내</h2><p>점보키즈에서 바로 사용할 수 있는 혜택입니다.</p>",
  noticeImageUrl:
    "https://images.unsplash.com/photo-1492725764893-90b379c2b6e7?auto=format&fit=crop&w=1200&q=80",
  selectedOrganizationIds: [],
  selectedProfileIds: []
};

const defaultItemDraft: ItemDraft = {
  title: "포토북 할인 쿠폰",
  benefitType: "coupon",
  amountLabel: "20% 할인",
  manualCode: "PHOTOBOOK-20",
  manualUrl: "https://jumbokids.example.com/coupons/photobook-20",
  jumbokidsBenefitType: "discount_coupon"
};

export function CouponManager() {
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [items, setItems] = useState(initialItems);
  const [form, setForm] = useState<CampaignFormState>(defaultCampaignForm);
  const [itemDraft, setItemDraft] = useState<ItemDraft>(defaultItemDraft);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const activeCount = useMemo(
    () => campaigns.filter((campaign) => campaign.isActive).length,
    [campaigns]
  );

  function updateForm<Key extends keyof CampaignFormState>(
    name: Key,
    value: CampaignFormState[Key]
  ) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function updateItem<Key extends keyof ItemDraft>(name: Key, value: ItemDraft[Key]) {
    setItemDraft((current) => ({ ...current, [name]: value }));
  }

  function toggleSelection(field: "selectedOrganizationIds" | "selectedProfileIds", id: string) {
    setForm((current) => {
      const selected = current[field];
      return {
        ...current,
        [field]: selected.includes(id)
          ? selected.filter((selectedId) => selectedId !== id)
          : [...selected, id]
      };
    });
  }

  async function saveCampaign() {
    setIsSaving(true);
    setStatus(null);

    const selectedOrganizationIds =
      form.targetScope === "selected_members" ? form.selectedOrganizationIds : [];
    const selectedProfileIds =
      form.targetScope === "selected_members" ? form.selectedProfileIds : [];
    const campaignPayload = {
      name: form.name.trim(),
      description: form.description.trim(),
      issueMode: form.issueMode,
      targetScope: form.targetScope,
      validFrom: form.validFrom,
      validUntil: form.validUntil,
      noticeType: form.noticeType,
      noticeHtml: form.noticeType === "html" ? form.noticeHtml : undefined,
      noticeImageUrl: form.noticeType === "image" ? form.noticeImageUrl : undefined,
      selectedOrganizationIds,
      selectedProfileIds
    };

    try {
      const campaignResponse = await postJson("/api/admin/coupon-campaigns", campaignPayload);
      const createdCampaign = unwrapData<CouponCampaign>(await campaignResponse.json());

      const itemPayload =
        form.issueMode === "manual"
          ? {
              title: itemDraft.title.trim(),
              benefitType: itemDraft.benefitType,
              amountLabel: itemDraft.amountLabel.trim(),
              manualCode: itemDraft.manualCode.trim() || undefined,
              manualUrl: itemDraft.manualUrl.trim() || undefined
            }
          : {
              title: itemDraft.title.trim(),
              benefitType: itemDraft.benefitType,
              amountLabel: itemDraft.amountLabel.trim(),
              jumbokidsBenefitType: itemDraft.jumbokidsBenefitType
            };

      const itemResult = await tryPostJson<CouponItem>(
        `/api/admin/coupon-campaigns/${createdCampaign.id}/items`,
        itemPayload
      );
      const targetResult =
        form.targetScope === "selected_members"
          ? await tryPostJson(`/api/admin/coupon-campaigns/${createdCampaign.id}/targets`, {
              selectedOrganizationIds,
              selectedProfileIds
            })
          : { ok: true };
      const noticeResult = await tryPostJson(
        `/api/admin/coupon-campaigns/${createdCampaign.id}/notice`,
        form.noticeType === "html"
          ? { noticeType: "html", noticeHtml: form.noticeHtml }
          : { noticeType: "image", noticeImageUrl: form.noticeImageUrl }
      );
      const createdItem = itemResult.ok
        ? itemResult.data
        : ({
            id: `draft-${createdCampaign.id}`,
            campaignId: createdCampaign.id,
            ...itemPayload
          } as CouponItem);

      setCampaigns((current) => [createdCampaign, ...current]);
      setItems((current) => [createdItem, ...current]);
      setStatus(
        itemResult.ok && targetResult.ok && noticeResult.ok
          ? "쿠폰 캠페인, 쿠폰 항목, 대상, 안내 콘텐츠 저장 요청이 완료되었습니다."
          : "쿠폰 캠페인은 저장되었습니다. 항목/대상/안내 API는 백엔드 지속 저장 연결 후 재시도됩니다."
      );
    } catch {
      setStatus("저장에 실패했습니다. URL 형식과 필수 입력값을 확인해주세요.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[430px_1fr]">
      <div className="rounded border border-line bg-white p-4 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-ink">쿠폰 캠페인 생성</h3>
            <p className="mt-1 text-sm leading-6 text-muted">
              발행 방식과 안내 콘텐츠를 정하고, 저장 시 기존 API 라우트에 순차 요청합니다.
            </p>
          </div>
          <Badge tone="green">활성 {activeCount}</Badge>
        </div>

        <div className="mt-4 grid gap-3">
          <Field label="캠페인명" htmlFor="coupon-name">
            <input
              id="coupon-name"
              value={form.name}
              onChange={(event) => updateForm("name", event.target.value)}
              className="w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </Field>

          <Field label="설명" htmlFor="coupon-description">
            <textarea
              id="coupon-description"
              value={form.description}
              onChange={(event) => updateForm("description", event.target.value)}
              rows={2}
              className="w-full resize-none rounded border border-line px-3 py-2 text-sm leading-6 outline-none focus:border-brand"
            />
          </Field>

          <SegmentedControl
            label="발행 방식"
            options={[
              { value: "manual", label: issueModeLabels.manual },
              { value: "jumbokids_api", label: issueModeLabels.jumbokids_api }
            ]}
            value={form.issueMode}
            onChange={(value) => updateForm("issueMode", value as BenefitIssueMode)}
          />

          <SegmentedControl
            label="발행 대상"
            options={[
              { value: "all_members", label: targetScopeLabels.all_members },
              { value: "selected_members", label: targetScopeLabels.selected_members }
            ]}
            value={form.targetScope}
            onChange={(value) => updateForm("targetScope", value as TargetScope)}
          />

          {form.targetScope === "selected_members" ? (
            <div className="rounded border border-line bg-surface p-3">
              <p className="text-sm font-semibold text-ink">선택 대상</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <SelectionGroup
                  title="기관"
                  options={organizations.map((organization) => ({
                    id: organization.id,
                    label: organization.name
                  }))}
                  selectedIds={form.selectedOrganizationIds}
                  onToggle={(id) => toggleSelection("selectedOrganizationIds", id)}
                />
                <SelectionGroup
                  title="회원"
                  options={profiles.map((profile) => ({ id: profile.id, label: profile.name }))}
                  selectedIds={form.selectedProfileIds}
                  onToggle={(id) => toggleSelection("selectedProfileIds", id)}
                />
              </div>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="유효 시작일" htmlFor="coupon-valid-from">
              <input
                id="coupon-valid-from"
                type="date"
                value={form.validFrom}
                onChange={(event) => updateForm("validFrom", event.target.value)}
                className="w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </Field>
            <Field label="유효 종료일" htmlFor="coupon-valid-until">
              <input
                id="coupon-valid-until"
                type="date"
                value={form.validUntil}
                onChange={(event) => updateForm("validUntil", event.target.value)}
                className="w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </Field>
          </div>

          <div className="rounded border border-line bg-surface p-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Plus size={16} aria-hidden />
              첫 쿠폰 항목
            </p>
            <div className="mt-3 grid gap-3">
              <Field label="쿠폰명" htmlFor="coupon-item-title">
                <input
                  id="coupon-item-title"
                  value={itemDraft.title}
                  onChange={(event) => updateItem("title", event.target.value)}
                  className="w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-brand"
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="혜택 유형" htmlFor="coupon-benefit-type">
                  <select
                    id="coupon-benefit-type"
                    value={itemDraft.benefitType}
                    onChange={(event) =>
                      updateItem("benefitType", event.target.value as ItemDraft["benefitType"])
                    }
                    className="w-full rounded border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand"
                  >
                    <option value="coupon">쿠폰</option>
                    <option value="credit">적립금</option>
                  </select>
                </Field>
                <Field label="금액/혜택 표기" htmlFor="coupon-amount">
                  <input
                    id="coupon-amount"
                    value={itemDraft.amountLabel}
                    onChange={(event) => updateItem("amountLabel", event.target.value)}
                    className="w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-brand"
                  />
                </Field>
              </div>

              {form.issueMode === "manual" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="수동 코드" htmlFor="manual-code">
                    <input
                      id="manual-code"
                      value={itemDraft.manualCode}
                      onChange={(event) => updateItem("manualCode", event.target.value)}
                      className="w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-brand"
                    />
                  </Field>
                  <Field label="수동 링크" htmlFor="manual-url">
                    <input
                      id="manual-url"
                      value={itemDraft.manualUrl}
                      onChange={(event) => updateItem("manualUrl", event.target.value)}
                      className="w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-brand"
                    />
                  </Field>
                </div>
              ) : (
                <Field label="점보키즈 혜택 타입" htmlFor="jumbokids-benefit-type">
                  <select
                    id="jumbokids-benefit-type"
                    value={itemDraft.jumbokidsBenefitType}
                    onChange={(event) =>
                      updateItem(
                        "jumbokidsBenefitType",
                        event.target.value as ItemDraft["jumbokidsBenefitType"]
                      )
                    }
                    className="w-full rounded border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand"
                  >
                    <option value="discount_coupon">할인 쿠폰</option>
                    <option value="photo_credit">사진 인화 적립금</option>
                    <option value="album_coupon">앨범 쿠폰</option>
                  </select>
                </Field>
              )}
            </div>
          </div>

          <SegmentedControl
            label="쿠폰 안내"
            options={[
              { value: "html", label: "HTML", icon: LinkIcon },
              { value: "image", label: "단일 이미지", icon: ImageIcon }
            ]}
            value={form.noticeType}
            onChange={(value) => updateForm("noticeType", value as NoticeType)}
          />

          {form.noticeType === "html" ? (
            <Field label="HTML 안내" htmlFor="notice-html">
              <textarea
                id="notice-html"
                value={form.noticeHtml}
                onChange={(event) => updateForm("noticeHtml", event.target.value)}
                rows={4}
                className="w-full resize-none rounded border border-line px-3 py-2 font-mono text-sm leading-6 outline-none focus:border-brand"
              />
            </Field>
          ) : (
            <Field label="이미지 URL" htmlFor="notice-image">
              <input
                id="notice-image"
                value={form.noticeImageUrl}
                onChange={(event) => updateForm("noticeImageUrl", event.target.value)}
                className="w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </Field>
          )}
        </div>

        <button
          type="button"
          onClick={saveCampaign}
          disabled={isSaving || !form.name.trim() || !itemDraft.title.trim()}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded bg-brand px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isSaving ? <Loader2 className="animate-spin" size={18} aria-hidden /> : <Save size={18} aria-hidden />}
          {isSaving ? "저장 중" : "캠페인 저장"}
        </button>

        {status ? <p className="mt-3 text-sm font-semibold text-muted">{status}</p> : null}
      </div>

      <div className="grid gap-3">
        {campaigns.map((campaign) => {
          const campaignItems = items.filter((item) => item.campaignId === campaign.id);

          return (
            <article key={campaign.id} className="rounded border border-line bg-white p-4 shadow-soft">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-ink">{campaign.name}</h3>
                    <Badge tone={campaign.issueMode === "manual" ? "amber" : "green"}>
                      {issueModeLabels[campaign.issueMode]}
                    </Badge>
                    <Badge tone={campaign.targetScope === "all_members" ? "blue" : "gray"}>
                      {targetScopeLabels[campaign.targetScope]}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted">{campaign.description}</p>
                </div>
                <div className="flex items-center gap-2 text-sm font-semibold text-muted">
                  <Users size={16} aria-hidden />
                  {campaign.targetScope === "all_members" ? "전체 회원" : "선택 기관/회원"}
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded border border-line bg-surface p-3">
                  <p className="text-sm font-semibold text-ink">등록 쿠폰</p>
                  <ul className="mt-2 grid gap-2 text-sm text-muted">
                    {(campaignItems.length
                      ? campaignItems
                      : [{ id: "empty", title: "신규 등록 대기", amountLabel: "1개 이상 등록 가능" }]
                    ).map((item) => (
                      <li key={item.id} className="flex items-start gap-2">
                        <Check className="mt-0.5 text-brand" size={16} aria-hidden />
                        <span>
                          <strong className="font-semibold text-ink">{item.title}</strong>{" "}
                          {item.amountLabel}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded border border-line bg-surface p-3">
                  <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                    {campaign.noticeType === "html" ? (
                      <FileText size={16} aria-hidden />
                    ) : (
                      <ImageIcon size={16} aria-hidden />
                    )}
                    안내 콘텐츠
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    {campaign.noticeType === "html"
                      ? "이메일은 HTML 원문을 사용하고, 카카오/SMS는 요약 문구와 랜딩 링크를 발송합니다."
                      : "이미지는 랜딩 페이지에 표시하고, 카카오/SMS는 안내 링크를 발송합니다."}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
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
    <label className="block text-sm font-semibold text-ink" htmlFor={htmlFor}>
      {label}
      <span className="mt-2 block">{children}</span>
    </label>
  );
}

function SegmentedControl({
  label,
  options,
  value,
  onChange
}: {
  label: string;
  options: Array<{
    value: string;
    label: string;
    icon?: React.ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
  }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-ink">{label}</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {options.map((option) => {
          const Icon = option.icon;
          return (
            <button
              type="button"
              key={option.value}
              onClick={() => onChange(option.value)}
              className={`inline-flex min-h-10 items-center justify-center gap-2 rounded border px-3 py-2 text-sm font-semibold ${
                value === option.value
                  ? "border-brand bg-emerald-50 text-brand"
                  : "border-line bg-white text-muted"
              }`}
            >
              {Icon ? <Icon size={16} aria-hidden /> : null}
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SelectionGroup({
  title,
  options,
  selectedIds,
  onToggle
}: {
  title: string;
  options: Array<{ id: string; label: string }>;
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted">{title}</p>
      <div className="mt-2 grid gap-2">
        {options.map((option) => (
          <label
            key={option.id}
            className="flex items-center gap-2 rounded border border-line bg-white px-3 py-2 text-sm text-muted"
          >
            <input
              type="checkbox"
              checked={selectedIds.includes(option.id)}
              onChange={() => onToggle(option.id)}
              className="h-4 w-4 accent-emerald-600"
            />
            {option.label}
          </label>
        ))}
      </div>
    </div>
  );
}

async function postJson(url: string, payload: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response;
}

async function tryPostJson<T = unknown>(url: string, payload: unknown) {
  try {
    const response = await postJson(url, payload);
    return { ok: true as const, data: unwrapData<T>(await response.json()) };
  } catch (error) {
    return { ok: false as const, error };
  }
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

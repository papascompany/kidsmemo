"use client";

import {
  Check,
  Copy,
  Download,
  ExternalLink,
  ShieldCheck,
  Store,
  TicketCheck
} from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "./badge";
import { organizations, profiles, staffCoupons } from "@/lib/mock-data";
import type { CouponUseSite, StaffCoupon } from "@/lib/types";

const siteLabels: Record<CouponUseSite, string> = {
  jumbokids: "점보키즈",
  godomall: "고도몰"
};

const assignedToLabels: Record<StaffCoupon["assignedTo"], string> = {
  owner: "원장님 전용",
  teacher: "선생님 전용",
  all_staff: "기관 교직원"
};

const statusLabels: Record<StaffCoupon["status"], string> = {
  available: "사용 가능",
  downloaded: "다운로드 완료",
  used: "사용 완료"
};

export function JumbokidsCouponWallet() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const currentOrganization = organizations[0];
  const organizationCoupons = staffCoupons.filter(
    (coupon) => coupon.organizationId === currentOrganization.id
  );
  const staffCount = profiles.filter(
    (profile) =>
      profile.organizationId === currentOrganization.id &&
      (profile.role === "owner" || profile.role === "teacher" || profile.role === "manager")
  ).length;
  const availableCount = useMemo(
    () => organizationCoupons.filter((coupon) => coupon.status !== "used").length,
    [organizationCoupons]
  );

  async function copyCode(code: string) {
    await navigator.clipboard?.writeText(code);
    setCopiedCode(code);
  }

  function downloadCoupon(coupon: StaffCoupon) {
    const content = [
      "키즈메모 점보키즈 쿠폰",
      `기관: ${currentOrganization.name}`,
      `쿠폰명: ${coupon.title}`,
      `혜택: ${coupon.amountLabel}`,
      `쿠폰/할인코드: ${coupon.code}`,
      `사용 가능 사이트: ${coupon.sites.map((site) => siteLabels[site]).join(", ")}`,
      `유효기간: ${coupon.validUntil}`,
      "안내: 점보키즈 관리자가 원장님/선생님 사용을 위해 제공한 쿠폰입니다."
    ].join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${coupon.code}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid gap-4">
      <section
        className="relative overflow-hidden rounded border border-line bg-ink text-white shadow-soft"
        style={{
          backgroundImage:
            "url(https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1600&q=85)"
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-ink/88 via-ink/66 to-ink/18" />
        <div className="relative grid min-h-[320px] content-end gap-5 p-5 sm:p-7 lg:grid-cols-[1.05fr_0.95fr] lg:p-8">
          <div className="max-w-2xl">
            <Badge tone="green">점보키즈 제공 혜택</Badge>
            <h3 className="text-wrap-anywhere mt-4 text-2xl font-semibold leading-tight tracking-normal sm:text-4xl">
              원장님과 선생님이 직접 사용할 쿠폰과 할인코드를 모았습니다.
            </h3>
            <p className="mt-4 text-sm leading-7 text-white/84">
              학부모 발송용 캠페인이 아니라, 점보키즈 관리자가 기관 교직원에게 제공한
              혜택을 내려받아 점보키즈와 고도몰 주문 과정에서 사용하는 쿠폰함입니다.
            </p>
          </div>

          <div className="grid self-end gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <WalletMetric label="기관" value={currentOrganization.name} />
            <WalletMetric label="교직원" value={`${staffCount}명`} />
            <WalletMetric label="사용 가능" value={`${availableCount}개`} />
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="grid gap-3">
          {organizationCoupons.map((coupon) => (
            <article key={coupon.id} className="rounded border border-line bg-white p-4 shadow-soft">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={coupon.status === "available" ? "green" : "blue"}>
                      {statusLabels[coupon.status]}
                    </Badge>
                    <Badge tone="gray">{assignedToLabels[coupon.assignedTo]}</Badge>
                  </div>
                  <h3 className="text-wrap-anywhere mt-3 text-xl font-semibold text-ink">
                    {coupon.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{coupon.description}</p>
                  <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div className="rounded border border-line bg-surface px-3 py-2">
                      <p className="text-xs font-semibold text-muted">쿠폰/할인코드</p>
                      <p className="mt-1 break-all font-mono text-lg font-semibold text-ink">
                        {coupon.code}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyCode(coupon.code)}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded border border-line bg-white px-4 py-2 text-sm font-semibold text-muted transition hover:border-brand hover:text-brand"
                    >
                      {copiedCode === coupon.code ? (
                        <Check size={17} aria-hidden />
                      ) : (
                        <Copy size={17} aria-hidden />
                      )}
                      {copiedCode === coupon.code ? "복사됨" : "코드 복사"}
                    </button>
                  </div>
                </div>

                <div className="grid shrink-0 gap-2 md:w-48">
                  <p className="rounded bg-emerald-50 px-3 py-2 text-center text-sm font-semibold text-brand">
                    {coupon.amountLabel}
                  </p>
                  <p className="text-center text-xs font-semibold text-muted">
                    {coupon.validUntil}까지
                  </p>
                  <button
                    type="button"
                    onClick={() => downloadCoupon(coupon)}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded bg-brand px-4 py-2 text-sm font-semibold text-white"
                  >
                    <Download size={17} aria-hidden />
                    쿠폰 다운로드
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {coupon.sites.map((site) => (
                  <a
                    key={site}
                    href={coupon.siteUrls[site]}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded border border-line bg-white px-3 py-2 text-sm font-semibold text-muted transition hover:border-brand hover:text-brand"
                  >
                    <Store size={16} aria-hidden />
                    {siteLabels[site]}에서 사용
                    <ExternalLink size={15} aria-hidden />
                  </a>
                ))}
              </div>
            </article>
          ))}
        </div>

        <aside className="grid content-start gap-3">
          <div className="rounded border border-line bg-white p-4 shadow-soft">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-ink">
              <ShieldCheck size={20} aria-hidden />
              운영 기준
            </h3>
            <ul className="mt-3 grid gap-2 text-sm leading-6 text-muted">
              <li>점보키즈 관리자가 발급하거나 등록한 쿠폰만 노출합니다.</li>
              <li>원장님/선생님은 쿠폰을 복사하거나 파일로 내려받아 사용합니다.</li>
              <li>학부모 발송이나 캠페인 생성 기능은 현재 제품 범위에 포함하지 않습니다.</li>
            </ul>
          </div>

          <div className="rounded border border-line bg-white p-4 shadow-soft">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-ink">
              <TicketCheck size={20} aria-hidden />
              다음 연동
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              실제 운영에서는 점보키즈 관리자 콘솔, 고도몰 쿠폰 API, Supabase Storage의
              다운로드 이력을 연결해 기관별로 제공된 쿠폰만 표시합니다.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function WalletMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/20 bg-white/14 p-3 backdrop-blur">
      <p className="text-xs font-semibold text-white/70">{label}</p>
      <p className="text-wrap-anywhere mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

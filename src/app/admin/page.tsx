import {
  BadgeCheck,
  Building2,
  Download,
  ExternalLink,
  Gift,
  Link2,
  ShieldCheck,
  UsersRound
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/badge";
import { organizations, profiles, staffCouponDownloads, staffCoupons } from "@/lib/mock-data";
import { getRuntimeBackendState } from "@/lib/runtime-state";
import type { StaffCoupon } from "@/lib/types";

const siteLabels = {
  jumbokids: "점보키즈",
  godomall: "고도몰"
};

const assignedToLabels = {
  owner: "원장",
  teacher: "선생님",
  all_staff: "전체 교직원"
};

const statusLabels = {
  available: "사용 가능",
  downloaded: "다운로드 완료",
  used: "사용 완료"
};

export default function AdminPage() {
  const runtimeState = getRuntimeBackendState();
  const availableCoupons = staffCoupons.filter((coupon) => coupon.status === "available");
  const downloadedCoupons = staffCoupons.filter((coupon) => coupon.status === "downloaded");

  return (
    <main className="min-h-screen bg-surface px-4 py-6 text-ink sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col justify-between gap-4 rounded border border-line bg-white p-5 shadow-soft lg:flex-row lg:items-center">
          <div>
            <Link href="/" className="text-sm font-semibold text-brand">
              키즈메모
            </Link>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal">운영 관리자 콘솔</h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-muted">
              기관별 점보키즈 쿠폰, 할인코드, 다운로드 링크, 인증 상태를 관리하는 운영자 전용
              화면입니다. 현재는 Supabase live 전환 전 mock 스켈레톤입니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="amber">{runtimeState.lockLabel}</Badge>
            <Badge tone={runtimeState.liveSupabaseArmed ? "green" : "gray"}>{runtimeState.modeLabel}</Badge>
          </div>
        </header>

        <section className="mt-5 grid gap-3 md:grid-cols-4">
          <Metric icon={Building2} label="관리 기관" value={`${organizations.length}곳`} />
          <Metric icon={Gift} label="등록 쿠폰" value={`${staffCoupons.length}개`} />
          <Metric icon={Download} label="다운로드 완료" value={`${downloadedCoupons.length}개`} />
          <Metric icon={BadgeCheck} label="사용 가능" value={`${availableCoupons.length}개`} />
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded border border-line bg-white p-5 shadow-soft">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-semibold text-brand">Coupon Assignment</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-normal">기관별 쿠폰/코드 세팅</h2>
              </div>
              <Badge tone="green">학부모 발송 아님</Badge>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-muted">
                    <th className="py-3 pr-3 font-semibold">기관</th>
                    <th className="py-3 pr-3 font-semibold">쿠폰명</th>
                    <th className="py-3 pr-3 font-semibold">코드</th>
                    <th className="py-3 pr-3 font-semibold">대상</th>
                    <th className="py-3 pr-3 font-semibold">사용처</th>
                    <th className="py-3 pr-3 font-semibold">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {staffCoupons.map((coupon) => (
                    <CouponRow key={coupon.id} coupon={coupon} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="rounded border border-line bg-white p-5 shadow-soft">
            <p className="text-sm font-semibold text-brand">New Benefit</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-normal">쿠폰 등록 폼</h2>
            <form className="mt-4 grid gap-3">
              <Field label="기관 선택" placeholder="햇살나무 어린이집" />
              <Field label="쿠폰/할인코드" placeholder="JK-DIRECTOR-20" />
              <Field label="혜택 라벨" placeholder="20% 할인" />
              <Field label="유효기간" placeholder="2026-07-31" />
              <Field label="점보키즈 링크" placeholder="https://jumbokids.example.com" />
              <Field label="고도몰 링크" placeholder="https://godomall.example.com" />
              <div className="grid gap-2 text-sm font-semibold text-ink">
                대상 역할
                <select className="rounded border border-line bg-surface px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20">
                  <option>전체 교직원</option>
                  <option>원장</option>
                  <option>선생님</option>
                </select>
              </div>
              <button
                type="button"
                className="rounded bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand/90"
              >
                mock 등록 준비 중
              </button>
            </form>
          </aside>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-3">
          <AdminPanel
            icon={UsersRound}
            title="회원/권한 관리"
            description="원장, 매니저, 선생님 멤버십과 플랫폼 운영자 권한을 분리해서 관리합니다."
          >
            <div className="mt-3 grid gap-2">
              {profiles.map((profile) => (
                <div key={profile.id} className="flex items-center justify-between rounded border border-line bg-surface p-3 text-sm">
                  <span className="font-semibold text-ink">{profile.name}</span>
                  <Badge tone={profile.role === "admin" ? "amber" : "gray"}>{profile.role}</Badge>
                </div>
              ))}
            </div>
          </AdminPanel>

          <AdminPanel
            icon={ShieldCheck}
            title="점보키즈 인증 상태"
            description="점보키즈 외부 회원/기관 ID, 인증 대기, 승인, 실패 상태를 추적합니다."
          >
            <div className="mt-3 grid gap-2 text-sm">
              {organizations.map((organization) => (
                <div key={organization.id} className="rounded border border-line bg-surface p-3">
                  <p className="font-semibold text-ink">{organization.name}</p>
                  <p className="mt-1 text-muted">verification_status: pending</p>
                </div>
              ))}
            </div>
          </AdminPanel>

          <AdminPanel
            icon={Link2}
            title="다운로드 이력"
            description="쿠폰 다운로드 기록은 추후 `staff_coupon_downloads`에 사용자 기준으로 저장합니다."
          >
            <div className="mt-3 rounded border border-line bg-surface p-3 text-sm text-muted">
              {staffCouponDownloads.length > 0
                ? `${staffCouponDownloads.length}건의 다운로드 이력이 있습니다.`
                : "아직 mock 다운로드 이력이 없습니다."}
            </div>
          </AdminPanel>
        </section>
      </div>
    </main>
  );
}

function CouponRow({ coupon }: { coupon: StaffCoupon }) {
  const organization = organizations.find((item) => item.id === coupon.organizationId);

  return (
    <tr className="border-b border-line last:border-b-0">
      <td className="py-3 pr-3 font-semibold text-ink">{organization?.name ?? "미지정 기관"}</td>
      <td className="py-3 pr-3">
        <p className="font-semibold text-ink">{coupon.title}</p>
        <p className="mt-1 text-xs text-muted">{coupon.amountLabel}</p>
      </td>
      <td className="py-3 pr-3 font-semibold text-brand">{coupon.code}</td>
      <td className="py-3 pr-3 text-muted">{assignedToLabels[coupon.assignedTo]}</td>
      <td className="py-3 pr-3">
        <div className="flex flex-wrap gap-2">
          {coupon.sites.map((site) => (
            <a
              key={site}
              href={coupon.siteUrls[site]}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded border border-line px-2 py-1 text-xs font-semibold text-muted transition hover:border-brand hover:text-ink"
            >
              {siteLabels[site]}
              <ExternalLink size={12} aria-hidden />
            </a>
          ))}
        </div>
      </td>
      <td className="py-3 pr-3">
        <Badge tone={coupon.status === "available" ? "green" : "blue"}>{statusLabels[coupon.status]}</Badge>
      </td>
    </tr>
  );
}

function Metric({
  icon: Icon,
  label,
  value
}: {
  icon: typeof Building2;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded border border-line bg-white p-4 shadow-soft">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded bg-brand/10 text-brand">
          <Icon size={20} aria-hidden />
        </div>
        <div>
          <p className="text-sm font-semibold text-muted">{label}</p>
          <p className="text-lg font-semibold text-ink">{value}</p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink">
      {label}
      <input
        className="rounded border border-line bg-surface px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
        placeholder={placeholder}
      />
    </label>
  );
}

function AdminPanel({
  icon: Icon,
  title,
  description,
  children
}: {
  icon: typeof UsersRound;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <article className="rounded border border-line bg-white p-5 shadow-soft">
      <div className="grid h-11 w-11 place-items-center rounded bg-brand/10 text-brand">
        <Icon size={21} aria-hidden />
      </div>
      <h2 className="mt-4 text-xl font-semibold tracking-normal">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
      {children}
    </article>
  );
}

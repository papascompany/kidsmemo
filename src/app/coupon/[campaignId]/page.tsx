import { notFound } from "next/navigation";
import { Badge } from "@/components/badge";
import { buildManualCouponLanding } from "@/lib/coupons";
import { couponCampaigns, getCampaignItems } from "@/lib/mock-data";
import { formatDate, issueModeLabels } from "@/lib/format";

export default async function CouponLandingPage({
  params
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  const campaign = couponCampaigns.find((item) => item.id === campaignId);

  if (!campaign) {
    notFound();
  }

  const landing = buildManualCouponLanding(campaign);
  const items = getCampaignItems(campaign.id);

  return (
    <main className="min-h-screen bg-surface px-4 py-6">
      <section className="mx-auto max-w-3xl rounded border border-line bg-white p-5 shadow-soft">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={campaign.issueMode === "manual" ? "amber" : "green"}>
            {issueModeLabels[campaign.issueMode]}
          </Badge>
          <Badge tone="blue">
            {formatDate(campaign.validFrom)} - {formatDate(campaign.validUntil)}
          </Badge>
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-normal text-ink">{landing.title}</h1>
        <p className="mt-3 text-sm leading-6 text-muted">{landing.description}</p>

        <div className="mt-6 overflow-hidden rounded border border-line bg-surface">
          {landing.noticeType === "image" && landing.noticeImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={landing.noticeImageUrl} alt={`${landing.title} 안내 이미지`} className="h-auto w-full" />
          ) : (
            <div
              className="prose max-w-none p-5"
              dangerouslySetInnerHTML={{
                __html: landing.noticeHtml || "<p>등록된 HTML 안내가 없습니다.</p>"
              }}
            />
          )}
        </div>

        <div className="mt-6 grid gap-3">
          {items.map((item) => (
            <article key={item.id} className="rounded border border-line bg-white p-4">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <h2 className="text-lg font-semibold text-ink">{item.title}</h2>
                  <p className="mt-1 text-sm text-muted">{item.amountLabel}</p>
                  {item.manualCode ? (
                    <p className="mt-3 inline-flex rounded bg-surface px-3 py-2 font-mono text-sm font-semibold text-ink">
                      {item.manualCode}
                    </p>
                  ) : null}
                </div>
                <a
                  href={item.manualUrl || "https://jumbokids.example.com"}
                  className="rounded bg-brand px-4 py-2 text-center text-sm font-semibold text-white"
                >
                  점보키즈에서 사용
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

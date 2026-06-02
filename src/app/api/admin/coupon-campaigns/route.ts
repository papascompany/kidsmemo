import { created, handleApiError, ok } from "@/lib/api-response";
import { getRepositories } from "@/lib/repositories";
import { couponCampaignCreateSchema } from "@/lib/validation";

export async function GET() {
  const repositories = getRepositories();
  const campaigns = await repositories.coupons.listCampaigns();

  return ok(campaigns);
}

export async function POST(request: Request) {
  try {
    const repositories = getRepositories();
    const payload = couponCampaignCreateSchema.parse(await request.json());
    const campaign = await repositories.coupons.createCampaign({
      ...payload,
      isActive: true
    });

    return created(campaign);
  } catch (error) {
    return handleApiError(error);
  }
}

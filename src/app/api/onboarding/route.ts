import { created, handleApiError, ok } from "@/lib/api-response";
import { AccessControlError } from "@/lib/access-control";
import {
  completeOnboarding,
  getBearerToken,
  getOnboardingStatus,
  onboardingRequestSchema
} from "@/lib/onboarding";

export async function GET(request: Request) {
  try {
    const accessToken = getBearerToken(request);
    if (!accessToken) {
      throw new AccessControlError("authentication_required", "로그인이 필요한 작업입니다.", 401);
    }

    return ok(await getOnboardingStatus(accessToken));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const accessToken = getBearerToken(request);
    if (!accessToken) {
      throw new AccessControlError("authentication_required", "로그인이 필요한 작업입니다.", 401);
    }

    const input = onboardingRequestSchema.parse(await request.json());
    return created(await completeOnboarding(accessToken, input));
  } catch (error) {
    return handleApiError(error);
  }
}

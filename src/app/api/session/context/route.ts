import { handleApiError, ok } from "@/lib/api-response";
import { AccessControlError, resolveRequestAccessContext } from "@/lib/access-control";
import { getRepositories } from "@/lib/repositories";
import { createSupabaseUserClient } from "@/lib/supabase";

type OrganizationRow = {
  id: string;
  name: string;
  type: "daycare" | "kindergarten";
  region: string;
};

type ProfileRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
};

export async function GET(request: Request) {
  try {
    const access = await resolveRequestAccessContext(request);

    if (access.source === "anonymous" || !access.accessToken) {
      throw new AccessControlError("authentication_required", "로그인이 필요한 작업입니다.", 401);
    }

    if (!access.organizationId || !access.role || !access.profileId) {
      throw new AccessControlError("membership_required", "기관 멤버십이 필요합니다.", 403);
    }

    const supabase = createSupabaseUserClient(access.accessToken);
    if (!supabase) {
      throw new AccessControlError("supabase_not_configured", "Supabase 인증 설정이 필요합니다.", 500);
    }

    const [organizationResult, profileResult, membershipCountResult, events] = await Promise.all([
      supabase
        .from("organizations")
        .select("id, name, type, region")
        .eq("id", access.organizationId)
        .single(),
      supabase
        .from("profiles")
        .select("id, name, email, phone")
        .eq("id", access.profileId)
        .maybeSingle(),
      supabase
        .from("memberships")
        .select("profile_id", { count: "exact", head: true })
        .eq("organization_id", access.organizationId),
      getRepositories(access).events.list()
    ]);

    if (organizationResult.error) {
      throw organizationResult.error;
    }

    if (profileResult.error) {
      throw profileResult.error;
    }

    if (membershipCountResult.error) {
      throw membershipCountResult.error;
    }

    const organization = organizationResult.data as OrganizationRow;
    const profile = profileResult.data as ProfileRow | null;

    return ok({
      organization: {
        id: organization.id,
        name: organization.name,
        type: organization.type,
        region: organization.region,
        memberCount: membershipCountResult.count ?? 0
      },
      director: profile
        ? {
            id: profile.id,
            name: profile.name,
            email: profile.email,
            phone: profile.phone ?? "",
            organizationId: access.organizationId,
            role: access.role
          }
        : undefined,
      members: [],
      events,
      coupons: []
    });
  } catch (error) {
    return handleApiError(error);
  }
}

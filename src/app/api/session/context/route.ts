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

    const [organizationResult, profileResult, membershipCountResult, events, contentBlocks, mediaAssets] = await Promise.all([
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
      getRepositories(access).events.list(),
      supabase
        .from("content_blocks")
        .select("*")
        .eq("scope", "organization")
        .eq("organization_id", access.organizationId)
        .eq("status", "published")
        .order("sort_order", { ascending: true }),
      supabase
        .from("media_assets")
        .select("*")
        .eq("scope", "organization")
        .eq("organization_id", access.organizationId)
        .eq("status", "published")
        .order("created_at", { ascending: true })
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

    if (contentBlocks.error) {
      throw contentBlocks.error;
    }

    if (mediaAssets.error) {
      throw mediaAssets.error;
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
      coupons: [],
      content: {
        blocks: (contentBlocks.data ?? []).map(mapContentBlock),
        media: (mediaAssets.data ?? []).map(mapMediaAsset)
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}

function mapContentBlock(row: Record<string, unknown>) {
  return {
    id: asString(row.id),
    scope: "organization" as const,
    organizationId: asString(row.organization_id),
    slot: asString(row.slot),
    title: asString(row.title),
    body: asString(row.body),
    imageUrl: asString(row.image_url),
    ctaLabel: asString(row.cta_label),
    ctaUrl: asString(row.cta_url),
    sortOrder: Number(row.sort_order ?? 0),
    status: "published" as const,
    updatedAt: asString(row.updated_at)
  };
}

function mapMediaAsset(row: Record<string, unknown>) {
  return {
    id: asString(row.id),
    scope: "organization" as const,
    organizationId: asString(row.organization_id),
    label: asString(row.label),
    url: asString(row.url),
    altText: asString(row.alt_text),
    usageSlot: asString(row.usage_slot),
    status: "published" as const,
    createdAt: asString(row.created_at)
  };
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

import { z } from "zod";
import { AccessControlError, assertRoleScope, resolveRequestAccessContext } from "@/lib/access-control";
import type { AdminOrganizationOption } from "@/lib/admin-organizations";
import { handleApiError, ok } from "@/lib/api-response";
import { isLiveSupabaseMode } from "@/lib/env-flags";
import { organizations } from "@/lib/mock-data";
import { createSupabaseUserClient } from "@/lib/supabase";

const querySchema = z.object({
  id: z.string().trim().min(1).optional(),
  q: z.string().trim().max(100).default(""),
  limit: z.coerce.number().int().min(1).max(50).default(20)
});

type OrganizationRow = {
  id: string;
  name: string;
  type: AdminOrganizationOption["type"];
  region: string;
};

export async function GET(request: Request) {
  try {
    const access = await resolveRequestAccessContext(request);

    if (isLiveSupabaseMode() && access.source === "anonymous") {
      throw new AccessControlError("authentication_required", "운영 관리자 로그인이 필요합니다.", 401);
    }

    assertRoleScope(access, ["admin"], "기관 목록은 platform admin만 조회할 수 있습니다.");

    const url = new URL(request.url);
    const query = querySchema.parse({
      id: url.searchParams.get("id") || undefined,
      q: url.searchParams.get("q") ?? "",
      limit: url.searchParams.get("limit") ?? undefined
    });

    if (!isLiveSupabaseMode()) {
      return ok({
        organizations: filterMockOrganizations(query.id, query.q, query.limit)
      });
    }

    if (!access.accessToken) {
      throw new AccessControlError("authentication_required", "운영 관리자 로그인이 필요합니다.", 401);
    }

    const supabase = createSupabaseUserClient(access.accessToken);
    if (!supabase) {
      throw new AccessControlError("supabase_not_configured", "Supabase 인증 설정이 필요합니다.", 500);
    }

    if (query.id) {
      const result = await supabase
        .from("organizations")
        .select("id, name, type, region")
        .eq("id", query.id)
        .limit(1);

      if (result.error) throw result.error;
      return ok({ organizations: ((result.data ?? []) as OrganizationRow[]).map(mapOrganization) });
    }

    const searchTerm = query.q.trim();
    if (!searchTerm) {
      const result = await supabase
        .from("organizations")
        .select("id, name, type, region")
        .order("name", { ascending: true })
        .limit(query.limit);

      if (result.error) throw result.error;
      return ok({ organizations: ((result.data ?? []) as OrganizationRow[]).map(mapOrganization) });
    }

    const pattern = `%${searchTerm}%`;
    const searches = [
      supabase.from("organizations").select("id, name, type, region").ilike("name", pattern).limit(query.limit),
      supabase.from("organizations").select("id, name, type, region").ilike("region", pattern).limit(query.limit)
    ];

    const type = parseOrganizationType(searchTerm);
    if (type) {
      searches.push(
        supabase.from("organizations").select("id, name, type, region").eq("type", type).limit(query.limit)
      );
    }

    const results = await Promise.all(searches);
    const failed = results.find((result) => result.error);
    if (failed?.error) throw failed.error;

    const uniqueOrganizations = new Map<string, AdminOrganizationOption>();
    for (const result of results) {
      for (const row of (result.data ?? []) as OrganizationRow[]) {
        const organization = mapOrganization(row);
        uniqueOrganizations.set(organization.id, organization);
      }
    }

    return ok({
      organizations: [...uniqueOrganizations.values()]
        .sort((left, right) => left.name.localeCompare(right.name, "ko"))
        .slice(0, query.limit)
    });
  } catch (error) {
    return handleApiError(error);
  }
}

function filterMockOrganizations(id: string | undefined, searchTerm: string, limit: number) {
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase("ko");

  return organizations
    .filter((organization) => {
      if (id) return organization.id === id;
      if (!normalizedSearch) return true;

      const typeLabel = organization.type === "daycare" ? "어린이집 daycare" : "유치원 kindergarten";
      return [organization.name, organization.region, typeLabel].some((value) =>
        value.toLocaleLowerCase("ko").includes(normalizedSearch)
      );
    })
    .slice(0, limit)
    .map(({ id: organizationId, name, type, region }) => ({
      id: organizationId,
      name,
      type,
      region
    }));
}

function parseOrganizationType(value: string): AdminOrganizationOption["type"] | null {
  const normalized = value.trim().toLocaleLowerCase("ko");
  if (normalized === "daycare" || normalized.includes("어린이집")) return "daycare";
  if (normalized === "kindergarten" || normalized.includes("유치원")) return "kindergarten";
  return null;
}

function mapOrganization(row: OrganizationRow): AdminOrganizationOption {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    region: row.region
  };
}

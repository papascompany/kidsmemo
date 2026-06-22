import { ok } from "@/lib/api-response";
import { adminMockOperations } from "@/lib/admin-operations";
import { isLiveSupabaseMode } from "@/lib/env-flags";
import { createSupabaseServiceClient } from "@/lib/supabase";

type Row = Record<string, unknown>;

export async function GET() {
  if (!isLiveSupabaseMode()) {
    return ok(adminMockOperations.contentBlocks.filter((block) => block.status === "published"));
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return ok([]);
  }

  const { data, error } = await supabase
    .from("content_blocks")
    .select("*")
    .eq("scope", "landing")
    .eq("status", "published")
    .order("sort_order", { ascending: true });

  if (error) {
    return ok([]);
  }

  return ok(((data ?? []) as Row[]).map(mapContentBlock));
}

function mapContentBlock(row: Row) {
  return {
    id: asString(row.id),
    scope: asString(row.scope),
    organizationId: nullableString(row.organization_id),
    slot: asString(row.slot),
    title: asString(row.title),
    body: asString(row.body),
    imageUrl: asString(row.image_url),
    ctaLabel: asString(row.cta_label),
    ctaUrl: asString(row.cta_url),
    sortOrder: Number(row.sort_order ?? 0),
    status: asString(row.status),
    updatedAt: asString(row.updated_at)
  };
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function nullableString(value: unknown) {
  return typeof value === "string" ? value : null;
}

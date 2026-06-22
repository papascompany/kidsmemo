import type { AdminContentBlock } from "./admin-operations";
import { isLiveSupabaseMode } from "./env-flags";
import { createSupabaseServiceClient } from "./supabase";

type Row = Record<string, unknown>;

export async function getPublishedLandingBlocks(): Promise<AdminContentBlock[]> {
  if (!isLiveSupabaseMode()) {
    return [];
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("content_blocks")
    .select("*")
    .eq("scope", "landing")
    .eq("status", "published")
    .order("sort_order", { ascending: true });

  if (error) {
    return [];
  }

  return ((data ?? []) as Row[]).map(mapContentBlock);
}

export function findLandingBlock(blocks: AdminContentBlock[], slot: string) {
  return blocks.find((block) => block.slot === slot);
}

function mapContentBlock(row: Row): AdminContentBlock {
  return {
    id: asString(row.id),
    scope: "landing",
    organizationId: null,
    slot: asString(row.slot),
    title: asString(row.title),
    body: asString(row.body),
    imageUrl: asString(row.image_url),
    ctaLabel: asString(row.cta_label),
    ctaUrl: asString(row.cta_url),
    sortOrder: Number(row.sort_order ?? 0),
    status: "published",
    updatedAt: asString(row.updated_at)
  };
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

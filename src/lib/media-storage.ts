import { createHash } from "crypto";
import { createSupabaseUserClient } from "./supabase";

export const ADMIN_MEDIA_BUCKET = "admin-media";
export const ADMIN_MEDIA_MAX_BYTES = 5 * 1024 * 1024;
export const ADMIN_MEDIA_ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

export type AdminMediaMimeType = (typeof ADMIN_MEDIA_ALLOWED_MIME_TYPES)[number];
export type AdminMediaScope = "landing" | "organization";
export type AdminMediaStatus = "draft" | "published" | "archived";

export interface AdminMediaUploadInput {
  file: File;
  slot: string;
  scope: AdminMediaScope;
  organizationId: string | null;
  label: string;
  altText: string;
  status: AdminMediaStatus;
  actorProfileId: string | null;
  accessToken?: string;
}

export interface AdminMediaUploadResult {
  bucket: string;
  path: string;
  publicUrl: string;
  slot: string;
  scope: AdminMediaScope;
  organizationId: string | null;
  contentType: AdminMediaMimeType;
  size: number;
  mediaAssetId: string | null;
  mock: boolean;
}

export function isAdminMediaMimeType(value: string): value is AdminMediaMimeType {
  return ADMIN_MEDIA_ALLOWED_MIME_TYPES.includes(value as AdminMediaMimeType);
}

export function buildAdminMediaObjectPath(input: {
  slot: string;
  scope: AdminMediaScope;
  organizationId: string | null;
  contentType: AdminMediaMimeType;
}) {
  const ownerSegment = input.scope === "organization" ? input.organizationId : "global";
  return [input.scope, ownerSegment, `${input.slot}.${extensionForMimeType(input.contentType)}`].join("/");
}

export function mockAdminMediaUpload(input: AdminMediaUploadInput): AdminMediaUploadResult {
  const contentType = input.file.type;
  if (!isAdminMediaMimeType(contentType)) {
    throw new Error("Unsupported mock media MIME type.");
  }

  const path = buildAdminMediaObjectPath({
    slot: input.slot,
    scope: input.scope,
    organizationId: input.organizationId,
    contentType
  });
  const fingerprint = createHash("sha256")
    .update(`${path}:${input.file.name}:${input.file.size}:${contentType}`)
    .digest("hex")
    .slice(0, 12);

  return {
    bucket: ADMIN_MEDIA_BUCKET,
    path,
    publicUrl: `https://mock.kidsmemo.local/storage/${ADMIN_MEDIA_BUCKET}/${path}?v=${fingerprint}`,
    slot: input.slot,
    scope: input.scope,
    organizationId: input.organizationId,
    contentType,
    size: input.file.size,
    mediaAssetId: null,
    mock: true
  };
}

export async function uploadAdminMedia(input: AdminMediaUploadInput): Promise<AdminMediaUploadResult> {
  const contentType = input.file.type;
  if (!isAdminMediaMimeType(contentType)) {
    throw new Error("Unsupported media MIME type.");
  }

  const supabase = input.accessToken ? createSupabaseUserClient(input.accessToken) : null;
  if (!supabase) {
    throw new Error("Supabase user client is not configured.");
  }

  const path = buildAdminMediaObjectPath({
    slot: input.slot,
    scope: input.scope,
    organizationId: input.organizationId,
    contentType
  });
  const bytes = await input.file.arrayBuffer();
  const upload = await supabase.storage.from(ADMIN_MEDIA_BUCKET).upload(path, bytes, {
    contentType,
    cacheControl: "3600",
    upsert: true
  });

  if (upload.error) {
    throw upload.error;
  }

  const publicUrl = supabase.storage.from(ADMIN_MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
  let existingQuery = supabase
    .from("media_assets")
    .select("id")
    .eq("scope", input.scope)
    .eq("usage_slot", input.slot)
    .limit(1);

  existingQuery =
    input.organizationId === null
      ? existingQuery.is("organization_id", null)
      : existingQuery.eq("organization_id", input.organizationId);

  const existing = await existingQuery.maybeSingle();
  if (existing.error) {
    throw existing.error;
  }

  const row = {
    scope: input.scope,
    organization_id: input.organizationId,
    label: input.label,
    url: publicUrl,
    alt_text: input.altText,
    usage_slot: input.slot,
    status: input.status,
    created_by: input.actorProfileId
  };
  const asset = existing.data?.id
    ? await supabase.from("media_assets").update(row).eq("id", existing.data.id).select("id").single()
    : await supabase
        .from("media_assets")
        .insert(row)
        .select("id")
        .single();

  if (asset.error) {
    throw asset.error;
  }

  const audit = await supabase.from("admin_audit_logs").insert({
    actor_profile_id: input.actorProfileId,
    action: existing.data?.id ? "replace" : "upload",
    resource_type: "mediaAssets",
    resource_id: asset.data.id,
    metadata: {
      bucket: ADMIN_MEDIA_BUCKET,
      path,
      slot: input.slot,
      size: input.file.size,
      contentType
    }
  });

  if (audit.error) {
    throw audit.error;
  }

  return {
    bucket: ADMIN_MEDIA_BUCKET,
    path,
    publicUrl,
    slot: input.slot,
    scope: input.scope,
    organizationId: input.organizationId,
    contentType,
    size: input.file.size,
    mediaAssetId: asset.data.id,
    mock: false
  };
}

function extensionForMimeType(contentType: AdminMediaMimeType) {
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "gif";
}

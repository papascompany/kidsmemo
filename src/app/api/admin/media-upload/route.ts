import { z } from "zod";
import { AccessControlError, assertRoleScope, resolveRequestAccessContext } from "@/lib/access-control";
import { handleApiError, ok } from "@/lib/api-response";
import { isLiveSupabaseMode } from "@/lib/env-flags";
import {
  ADMIN_MEDIA_ALLOWED_MIME_TYPES,
  ADMIN_MEDIA_MAX_BYTES,
  isAdminMediaMimeType,
  mockAdminMediaUpload,
  uploadAdminMedia
} from "@/lib/media-storage";

const uploadFieldsSchema = z
  .object({
    slot: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .regex(/^[a-z0-9][a-z0-9_-]*$/, "slot은 영문 소문자, 숫자, -, _만 사용할 수 있습니다."),
    scope: z.enum(["landing", "organization"]).default("landing"),
    organizationId: z.string().uuid().nullable().default(null),
    label: z.string().trim().max(120).optional(),
    altText: z.string().trim().max(300).default(""),
    status: z.enum(["draft", "published", "archived"]).default("draft")
  })
  .superRefine((value, context) => {
    if (value.scope === "landing" && value.organizationId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["organizationId"],
        message: "landing 범위는 organizationId가 없어야 합니다."
      });
    }

    if (value.scope === "organization" && !value.organizationId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["organizationId"],
        message: "organization 범위는 organizationId가 필요합니다."
      });
    }
  });

export async function POST(request: Request) {
  try {
    const access = await resolveRequestAccessContext(request);
    if (access.source === "anonymous") {
      throw new AccessControlError("authentication_required", "운영 관리자 로그인이 필요합니다.", 401);
    }
    assertRoleScope(access, ["admin"], "이미지 업로드는 platform admin만 수행할 수 있습니다.");

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw new AccessControlError("validation_error", "file 이미지가 필요합니다.", 400);
    }

    validateImageFile(file);

    const fields = uploadFieldsSchema.parse({
      slot: formData.get("slot"),
      scope: formData.get("scope") || undefined,
      organizationId: formData.get("organizationId") || null,
      label: formData.get("label") || undefined,
      altText: formData.get("altText") || "",
      status: formData.get("status") || undefined
    });
    const label = fields.label || file.name || fields.slot;
    const input = {
      file,
      slot: fields.slot,
      scope: fields.scope,
      organizationId: fields.organizationId,
      label,
      altText: fields.altText,
      status: fields.status,
      actorProfileId: access.profileId,
      accessToken: access.accessToken
    };

    return ok(isLiveSupabaseMode() ? await uploadAdminMedia(input) : mockAdminMediaUpload(input));
  } catch (error) {
    return handleApiError(error);
  }
}

function validateImageFile(file: File) {
  if (!isAdminMediaMimeType(file.type)) {
    throw new AccessControlError(
      "unsupported_media_type",
      "지원하지 않는 이미지 형식입니다.",
      415,
      { allowedMimeTypes: ADMIN_MEDIA_ALLOWED_MIME_TYPES }
    );
  }

  if (file.size <= 0) {
    throw new AccessControlError("empty_file", "비어 있는 파일은 업로드할 수 없습니다.", 400);
  }

  if (file.size > ADMIN_MEDIA_MAX_BYTES) {
    throw new AccessControlError(
      "file_too_large",
      "이미지 파일은 5MB 이하만 업로드할 수 있습니다.",
      413,
      { maxBytes: ADMIN_MEDIA_MAX_BYTES }
    );
  }
}

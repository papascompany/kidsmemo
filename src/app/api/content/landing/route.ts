import { ok } from "@/lib/api-response";
import { adminMockOperations } from "@/lib/admin-operations";
import { isLiveSupabaseMode } from "@/lib/env-flags";
import { getPublishedLandingBlocks } from "@/lib/landing-content";

export async function GET() {
  if (!isLiveSupabaseMode()) {
    return ok(adminMockOperations.contentBlocks.filter((block) => block.status === "published"));
  }

  return ok(await getPublishedLandingBlocks());
}

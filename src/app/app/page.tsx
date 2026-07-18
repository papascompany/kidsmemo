import { KidsmemoDashboard } from "@/components/kidsmemo-dashboard";
import { isLiveSupabaseMode } from "@/lib/env-flags";

export default function AppPage() {
  return <KidsmemoDashboard liveBackend={isLiveSupabaseMode()} />;
}

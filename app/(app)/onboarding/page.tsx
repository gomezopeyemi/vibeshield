import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { OnboardingWorkspace } from "@/components/onboarding/onboarding-workspace";

export const metadata: Metadata = { title: "Connect & Scan" };

export default function OnboardingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Connect & Scan"
        description="Connect an AI-built application and run its first production-readiness scan. Watch the real analyzer work in real time."
        badge={<Badge tone="brand" size="md">Zero-friction onboarding</Badge>}
      />
      <OnboardingWorkspace />
    </div>
  );
}

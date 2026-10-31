import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="31 October 2026"
      sections={[
        {
          heading: "1. The service",
          body: [
            "VibeShield analyses application source code and related configuration for security, cost and reliability issues, and suggests fixes. During early access the service is provided free of charge, features may change, and some described features are still in development.",
          ],
        },
        {
          heading: "2. Your account",
          body: [
            "You must provide a valid email address and keep your password confidential. You are responsible for activity under your account. Tell us promptly if you suspect unauthorised access.",
          ],
        },
        {
          heading: "3. Code you connect",
          body: [
            "You may only scan code and systems you own or are authorised to test. You keep all rights to your code. You grant VibeShield permission to process it solely to provide the service to you.",
          ],
        },
        {
          heading: "4. Acceptable use",
          body: [
            "Do not use VibeShield to attack, probe or access systems without permission, to break the law, or to disrupt the service or other users.",
          ],
        },
        {
          heading: "5. No guarantee",
          body: [
            "Findings and suggested fixes are aids, not guarantees. A high readiness score does not mean an application is secure or free of defects. Review every change before you deploy it. The service is provided “as is” to the extent the law allows.",
          ],
        },
        {
          heading: "6. Ending your account",
          body: [
            "You can stop using the service at any time. We may suspend accounts that breach these terms. Account deletion from within the app is in development; until then, deletion requests will be handled manually once contact details are published.",
          ],
        },
        {
          heading: "7. Changes",
          body: ["We will post updated terms here and change the date above. Material changes will be notified to account holders by email."],
        },
      ]}
    />
  );
}

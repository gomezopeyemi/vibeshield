import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="31 October 2026"
      sections={[
        {
          heading: "What we collect",
          body: [
            "Account data: your name, email address and a securely hashed password. Scan data: the results of scans you run, including file paths, line numbers and short code excerpts with detected secrets redacted. Technical data: the session cookies needed to keep you signed in.",
          ],
        },
        {
          heading: "How we use it",
          body: [
            "To create and secure your account, send account emails (verification and password reset), run the scans you request and show you their results. We do not sell personal data and do not use your code to train AI models.",
          ],
        },
        {
          heading: "Who processes it",
          body: [
            "Authentication and data storage are provided by Supabase. Hosting providers process requests on our behalf. Each processes data only to provide its service to us.",
          ],
        },
        {
          heading: "Cookies",
          body: ["We use strictly necessary cookies to keep you signed in. We do not use advertising or tracking cookies."],
        },
        {
          heading: "Retention and your rights",
          body: [
            "We keep account and scan data while your account is active. You can ask to access, correct or delete your data; self-service deletion is in development, and requests will be handled manually once contact details are published here.",
          ],
        },
        {
          heading: "Security",
          body: [
            "Data is encrypted in transit, privileged keys stay on our servers, and access to scan data is restricted to the account that created it.",
          ],
        },
      ]}
    />
  );
}

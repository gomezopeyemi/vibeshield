import type { Metadata } from "next";
import { BRAND, themeAttrs } from "@/lib/brand";
import { BackgroundObserver } from "@/components/marketing/background-observer";
import { MotionProvider } from "@/components/marketing/motion-provider";
import { Hero } from "@/components/marketing/hero/hero";
import { WordmarkLabel, WordmarkRow } from "@/components/marketing/sections/wordmarks";
import { AllHere } from "@/components/marketing/sections/all-here";
import { HowItWorks } from "@/components/marketing/sections/how-it-works";
import { Checks } from "@/components/marketing/sections/checks";
import { BuiltFor } from "@/components/marketing/sections/built-for";
import { Resources } from "@/components/marketing/sections/resources";
import { FinalCta } from "@/components/marketing/sections/final-cta";

export const metadata: Metadata = {
  title: { absolute: `${BRAND.name}: ${BRAND.headline}` },
  description: BRAND.subhead,
};

export default function HomePage() {
  return (
    <MotionProvider>
      <BackgroundObserver />
      {/* The first wordmark row is sticky to the viewport bottom: it rides along
          the hero, then settles into its slot under the label. Its sticky range
          is this wrapper, so the row must stay a direct child of it. */}
      <div className="relative">
        <Hero />
        <div {...themeAttrs("offwhite")} className="pt-12 sm:pt-20">
          <WordmarkLabel />
        </div>
        {/* The band takes the current page colour, so over the hero it covers the mockup's lower edge
            and once settled it matches the section and disappears. */}
        <div {...themeAttrs("offwhite")} className="sticky bottom-0 z-20 bg-[linear-gradient(to_top,var(--page-bg)_65%,transparent)] pb-6 pt-10">
          <WordmarkRow part={0} />
        </div>
        <div {...themeAttrs("offwhite")} className="pb-4">
          <WordmarkRow part={1} />
        </div>
      </div>
      <AllHere />
      <HowItWorks />
      <Checks />
      <BuiltFor />
      <Resources />
      <FinalCta />
    </MotionProvider>
  );
}

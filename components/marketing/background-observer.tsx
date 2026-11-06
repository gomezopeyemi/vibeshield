"use client";

import { useEffect } from "react";

/* Page colour follows the section under the viewport's midline: each section
 * declares data-bg / data-fg and this sets --page-bg / --page-fg on <html>,
 * which .mk-root transitions. Removed on unmount so other pages keep their
 * defaults.
 *
 * The observer only says *when* something crossed the midline. Which section
 * is there now is measured directly, because a fast scroll can jump a short
 * section over the midline without it ever being reported as intersecting. */
export function BackgroundObserver() {
  useEffect(() => {
    const root = document.documentElement;
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-bg]"));

    const sync = () => {
      const mid = window.innerHeight / 2;
      const current = sections.find((el) => {
        const r = el.getBoundingClientRect();
        return r.top <= mid && r.bottom > mid;
      });
      if (!current) return; // in a gap between themed sections: keep the last colour
      const { bg, fg } = current.dataset;
      if (bg) root.style.setProperty("--page-bg", bg);
      if (fg) root.style.setProperty("--page-fg", fg);
    };

    const io = new IntersectionObserver(sync, { rootMargin: "-50% 0px -50% 0px" });
    sections.forEach((el) => io.observe(el));
    sync();
    return () => {
      io.disconnect();
      root.style.removeProperty("--page-bg");
      root.style.removeProperty("--page-fg");
    };
  }, []);
  return null;
}

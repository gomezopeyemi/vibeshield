// Pre-bakes the hero's "wavy dot" texture as a seamless SVG tile, so the page
// doesn't run an SVG displacement filter over the whole hero at paint time.
// Run: node scripts/gen-hero-dots.mjs  →  public/marketing/hero-dots.svg
import { writeFileSync } from "node:fs";

const TILE = 140; // a multiple of STEP, and of every wave period below, so the tile repeats seamlessly
const STEP = 7;
const AMP = 2.2;

let dots = "";
for (let y = 0; y < TILE; y += STEP) {
  for (let x = 0; x < TILE; x += STEP) {
    const dx = AMP * Math.sin((4 * Math.PI * y) / TILE);
    const dy = AMP * Math.sin((2 * Math.PI * x) / TILE + (2 * Math.PI * y) / TILE);
    dots += `<circle cx="${(x + STEP / 2 + dx).toFixed(1)}" cy="${(y + STEP / 2 + dy).toFixed(1)}" r="1.1"/>`;
  }
}
writeFileSync(
  new URL("../public/marketing/hero-dots.svg", import.meta.url),
  `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE}" height="${TILE}" fill="#fff">${dots}</svg>\n`,
);

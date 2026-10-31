import { cn } from "@/lib/utils";

/** Minimal monochrome brand glyphs (currentColor), used in integration cards,
 * connect flows and tool selectors. Not official brand assets — simple marks. */
export type BrandName =
  | "github"
  | "supabase"
  | "vercel"
  | "stripe"
  | "cursor"
  | "lovable"
  | "bolt"
  | "v0"
  | "windsurf"
  | "replit"
  | "claude"
  | "openai"
  | "anthropic"
  | "google";

export function BrandGlyph({
  name,
  className,
  size = 18,
}: {
  name: BrandName;
  className?: string;
  size?: number;
}) {
  const p = { width: size, height: size, className: cn("shrink-0", className) };
  switch (name) {
    case "github":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
          <path d="M12 .5A11.5 11.5 0 0 0 .5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.78 1.2 1.78 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.56-.3-5.26-1.28-5.26-5.7 0-1.26.45-2.29 1.19-3.1-.12-.3-.52-1.47.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.5 3.17-1.18 3.17-1.18.63 1.58.23 2.75.11 3.04.74.82 1.19 1.85 1.19 3.11 0 4.43-2.7 5.4-5.28 5.69.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5Z" />
        </svg>
      );
    case "supabase":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
          <path d="M13.4 22.6c-.6.76-1.83.34-1.84-.63l-.17-9.37h6.3c1.14 0 1.78 1.32 1.07 2.22l-5.36 7.78ZM10.6 1.4c.6-.76 1.83-.34 1.84.63l.12 9.37H6.33c-1.14 0-1.78-1.32-1.07-2.21L10.6 1.4Z" />
        </svg>
      );
    case "vercel":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
          <path d="M12 2 22 20H2L12 2Z" />
        </svg>
      );
    case "stripe":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
          <path d="M11.3 9.6c0-.7.57-.97 1.5-.97 1.35 0 3.05.41 4.4 1.14V5.65A11.7 11.7 0 0 0 12.8 4.8c-3.6 0-6 1.88-6 5.02 0 4.9 6.74 4.12 6.74 6.23 0 .83-.72 1.1-1.7 1.1-1.47 0-3.35-.6-4.84-1.42v4.2c1.65.71 3.31 1.01 4.84 1.01 3.69 0 6.24-1.82 6.24-5 0-5.29-6.78-4.35-6.78-6.34Z" />
        </svg>
      );
    case "cursor":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
          <path d="M4 3l16 7.2-7 1.8-1.9 7L4 3Z" />
        </svg>
      );
    case "bolt":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
          <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
        </svg>
      );
    case "v0":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
          <path d="M3 7h3v10H3V7Zm15 0h3l-4.5 10h-3L18 7Z" />
          <circle cx="11.5" cy="12" r="3.5" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
    case "windsurf":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
          <path d="M4 20 14 3v14l-10 3Zm12-3V6l4 11-4 0Z" />
        </svg>
      );
    case "replit":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
          <path d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Z" />
        </svg>
      );
    case "lovable":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
          <path d="M12 21s-7-4.5-9.3-9C1 8.4 2.8 5 6.2 5c2 0 3.3 1.2 4 2.3C10.9 6.2 12.2 5 14.2 5c3.4 0 5.2 3.4 3.5 7-2.3 4.5-5.7 9-5.7 9Z" />
        </svg>
      );
    case "claude":
    case "anthropic":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
          <path d="m7 18 3.3-8.4h.7L14.3 18h-1.9l-.7-1.9H9.3L8.6 18H7Zm2.9-3.4h2L10.9 11l-1 3.6ZM15 18V6h1.8v12H15Z" />
        </svg>
      );
    // The only coloured mark: a "Sign in with Google" button conventionally shows
    // the four-colour G rather than a monochrome glyph.
    case "google":
      return (
        <svg viewBox="0 0 48 48" {...p}>
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" />
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65Z" />
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.28-3.14.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.88.92 7.54 2.55 10.78l7.98-6.19Z" />
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" />
        </svg>
      );
    case "openai":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
          <path d="M12 3a4 4 0 0 1 3.5 2M12 3a4 4 0 0 0-3.5 2M12 21a4 4 0 0 0 3.5-2M12 21a4 4 0 0 1-3.5-2M4.5 7.5 12 12l7.5-4.5M12 12v9M4.5 7.5v9L12 21M19.5 7.5v9" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
  }
}

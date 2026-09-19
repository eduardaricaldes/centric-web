import type { ReactNode } from "react";

type Tone = "neutral" | "amber" | "green" | "red" | "north";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-ivory text-muted border-line",
  amber: "bg-amber/15 text-amber-ink border-amber/30",
  green: "bg-green-tint text-green border-green/20",
  red: "bg-red-tint text-red border-red/20",
  north: "bg-north-tint text-north border-north/15",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs
        font-medium ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}

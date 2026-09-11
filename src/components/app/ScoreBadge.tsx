import { cn } from "@/lib/utils";
import { scoreTone } from "@/lib/types";

export interface ScoreBadgeProps {
  score: number;
  className?: string;
}

/** Indicador discreto de ICP Score (alto / médio / baixo). */
export function ScoreBadge({ score, className }: ScoreBadgeProps) {
  const tone = scoreTone(score);
  return (
    <span
      title={`ICP Score ${score} (${tone})`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium tabular-nums",
        tone === "alto" && "border-transparent bg-mint/20 text-foreground",
        tone === "medio" && "border-transparent bg-butter/25 text-foreground",
        tone === "baixo" && "border-transparent bg-blossom/25 text-foreground",
        className,
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          tone === "alto" && "bg-mint",
          tone === "medio" && "bg-butter",
          tone === "baixo" && "bg-blossom",
        )}
      />
      {score}
    </span>
  );
}

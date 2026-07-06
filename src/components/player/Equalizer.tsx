import { cn } from "@/lib/utils";

interface EqualizerProps {
  barsCount?: number;
  className?: string;
  barClassName?: string;
  isPlaying?: boolean;
}

export function Equalizer({
  barsCount = 5,
  className,
  barClassName,
  isPlaying = true,
}: EqualizerProps) {
  // Negative animation delays to offset the bars out of phase
  const delays = [
    "-0.6s",
    "-0.15s",
    "-0.85s",
    "-0.4s",
    "-0.7s",
    "-0.25s",
    "-0.95s",
    "-0.5s",
  ];

  return (
    <div
      className={cn("flex items-end gap-[2px] h-4 shrink-0 select-none pointer-events-none", className)}
      aria-hidden="true"
    >
      {Array.from({ length: barsCount }).map((_, i) => {
        const delay = delays[i % delays.length];
        return (
          <span
            key={i}
            className={cn(
              "w-[2px] h-full bg-primary rounded-full css-equalizer-bar",
              !isPlaying && "animate-none scale-y-[0.25]",
              barClassName
            )}
            style={{
              animationDelay: isPlaying ? delay : undefined,
            }}
          />
        );
      })}
    </div>
  );
}

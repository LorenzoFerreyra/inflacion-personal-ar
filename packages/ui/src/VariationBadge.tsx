export interface VariationBadgeProps {
  value: number | null;
  variant?: "default" | "alert";
}

export default function VariationBadge({ value, variant = "default" }: VariationBadgeProps) {
  if (value === null || value === undefined) {
    return <span className="text-zinc-600">&mdash;</span>;
  }

  const isPositive = value > 0;
  const isZero = value === 0;

  let classes: string;
  if (isZero) {
    classes = "bg-zinc-800/50 text-zinc-400";
  } else if (isPositive) {
    if (variant === "alert" && value > 20) {
      classes = "bg-red-500/10 text-red-400";
    } else if (variant === "alert" && value > 10) {
      classes = "bg-amber-500/10 text-amber-400";
    } else {
      classes = "bg-green-500/10 text-green-400";
    }
  } else {
    classes = "bg-red-500/10 text-red-400";
  }

  const sign = isPositive ? "+" : "";

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[12px] font-semibold tabular-nums ${classes}`}
    >
      {sign}
      {value.toFixed(1)}%
    </span>
  );
}

interface Props {
  label: string;
  value: string;
  subtitle?: string;
  color?: "red" | "green" | "neutral";
}

/**
 * Editorial stat block: thick top rule, label, big display numeral.
 * The rule color carries the inflation semantics (red = sube, green = baja).
 */
export default function KpiCard({
  label,
  value,
  subtitle,
  color = "neutral",
}: Props) {
  const styles = {
    red: { rule: "border-red-400", value: "text-red-400" },
    green: { rule: "border-green-400", value: "text-green-400" },
    neutral: { rule: "border-zinc-200", value: "text-zinc-50" },
  };

  const s = styles[color];

  return (
    <div className={`border-t-2 ${s.rule} pt-3`}>
      <p className="text-[13px] text-zinc-400">{label}</p>
      <p
        className={`font-display text-4xl font-semibold tabular-nums mt-1 ${s.value}`}
      >
        {value}
      </p>
      {subtitle && (
        <p className="text-xs text-zinc-500 mt-1.5 truncate" title={subtitle}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

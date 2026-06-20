interface Props {
  label: string;
  value: string;
  subtitle?: string;
  color?: "red" | "green" | "neutral";
}

export default function KpiCard({
  label,
  value,
  subtitle,
  color = "neutral",
}: Props) {
  const styles = {
    red: {
      bg: "from-red-500/6 to-transparent",
      border: "border-red-500/15",
      value: "text-red-400",
    },
    green: {
      bg: "from-green-500/6 to-transparent",
      border: "border-green-500/15",
      value: "text-green-400",
    },
    neutral: {
      bg: "from-zinc-800/40 to-transparent",
      border: "border-zinc-800/50",
      value: "text-zinc-50",
    },
  };

  const s = styles[color];

  return (
    <div
      className={`bg-linear-to-br ${s.bg} border ${s.border} rounded-xl p-6`}
    >
      <p className="text-xs font-medium text-zinc-400 mb-2 uppercase">
        {label}
      </p>
      <p className={`font-display text-3xl font-semibold ${s.value}`}>{value}</p>
      {subtitle && (
        <p className="text-xs text-zinc-500 mt-2 leading-relaxed truncate" title={subtitle}>{subtitle}</p>
      )}
    </div>
  );
}

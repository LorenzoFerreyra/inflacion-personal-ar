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
      bg: "from-red-500/8 to-red-500/3",
      border: "border-red-500/20",
      value: "text-red-400",
      glow: "shadow-red-500/5",
    },
    green: {
      bg: "from-green-500/8 to-green-500/3",
      border: "border-green-500/20",
      value: "text-green-400",
      glow: "shadow-green-500/5",
    },
    neutral: {
      bg: "from-zinc-800/60 to-zinc-800/30",
      border: "border-zinc-700/40",
      value: "text-zinc-50",
      glow: "",
    },
  };

  const s = styles[color];

  return (
    <div
      className={`bg-linear-to-br ${s.bg} border ${s.border} rounded-xl p-5 shadow-lg ${s.glow}`}
    >
      <p className="text-[13px] font-medium text-zinc-400 mb-1.5 tracking-wide">
        {label}
      </p>
      <p className={`font-display text-4xl font-semibold tracking-tight ${s.value}`}>{value}</p>
      {subtitle && (
        <p className="text-xs text-zinc-400 mt-1.5">{subtitle}</p>
      )}
    </div>
  );
}

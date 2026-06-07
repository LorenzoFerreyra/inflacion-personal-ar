/**
 * KpiCard.tsx — Tarjeta de indicador clave (KPI).
 *
 * Muestra un valor numérico grande con un label descriptivo.
 * Acepta un color semántico opcional (rojo/verde/neutro).
 */

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
  const colorClasses = {
    red: "text-red-400",
    green: "text-green-400",
    neutral: "text-zinc-100",
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
      <p className="text-sm text-zinc-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</p>
      {subtitle && (
        <p className="text-xs text-zinc-500 mt-1">{subtitle}</p>
      )}
    </div>
  );
}

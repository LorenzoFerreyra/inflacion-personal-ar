import { fmtPct } from "@/lib/format";

interface Props {
  value: number | null;
}

/**
 * Variación de precio como número firmado en mono, sin chip decorativo.
 * Semántica de inflación en toda la app: sube = rojo, baja = verde.
 */
export default function VariationBadge({ value }: Props) {
  if (value === null || value === undefined) {
    return <span className="text-zinc-600">—</span>;
  }

  const color =
    value === 0
      ? "text-zinc-400"
      : value > 0
        ? "text-red-400"
        : "text-green-400";

  return (
    <span
      className={`tabular text-[13px] font-bold whitespace-nowrap ${color}`}
    >
      {fmtPct(value)}
    </span>
  );
}

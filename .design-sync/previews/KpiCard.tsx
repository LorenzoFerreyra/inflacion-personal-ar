import { KpiCard } from 'inflacion-personal-ar';

export function Neutral() {
  return (
    <div className="bg-zinc-950 p-6 w-72">
      <KpiCard label="Inflación acumulada" value="87.3%" subtitle="Enero–Junio 2025" />
    </div>
  );
}

export function Positive() {
  return (
    <div className="bg-zinc-950 p-6 w-72">
      <KpiCard label="Variación mensual" value="+4.2%" subtitle="vs. mes anterior" color="green" />
    </div>
  );
}

export function Alert() {
  return (
    <div className="bg-zinc-950 p-6 w-72">
      <KpiCard label="Canasta básica" value="+23.1%" subtitle="Variación interanual" color="red" />
    </div>
  );
}

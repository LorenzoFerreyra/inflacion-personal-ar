import { EmptyState, Package } from 'inflacion-personal-ar';

export function WithIcon() {
  return (
    <div className="bg-zinc-950 p-4 w-full max-w-md">
      <EmptyState
        message="No se encontraron productos."
        icon={<Package size={32} strokeWidth={1.2} className="text-zinc-600" />}
      />
    </div>
  );
}

export function TextOnly() {
  return (
    <div className="bg-zinc-950 p-4 w-full max-w-md">
      <EmptyState message="Sin datos disponibles para este período." />
    </div>
  );
}

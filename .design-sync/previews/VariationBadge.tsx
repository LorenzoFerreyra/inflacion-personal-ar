import { VariationBadge } from 'inflacion-personal-ar';

export function States() {
  return (
    <div className="bg-zinc-950 p-6 flex items-center gap-3 flex-wrap">
      <VariationBadge value={4.2} />
      <VariationBadge value={-2.1} />
      <VariationBadge value={0} />
      <VariationBadge value={null} />
    </div>
  );
}

export function AlertVariant() {
  return (
    <div className="bg-zinc-950 p-6 flex items-center gap-3 flex-wrap">
      <VariationBadge value={5} variant="alert" />
      <VariationBadge value={12} variant="alert" />
      <VariationBadge value={25} variant="alert" />
    </div>
  );
}

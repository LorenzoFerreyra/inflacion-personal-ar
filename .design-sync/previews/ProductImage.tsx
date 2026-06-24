import { ProductImage } from 'inflacion-personal-ar';

export function InitialsFallback() {
  return (
    <div className="bg-zinc-950 p-6 flex items-center gap-4">
      <ProductImage src={null} alt="Coca-Cola 1.5L" marca="Coca-Cola" size="sm" />
      <ProductImage src={null} alt="La Serenísima Leche" marca="La Serenísima" size="sm" />
      <ProductImage src={null} alt="Ser Yogur" marca="Ser" size="sm" />
      <ProductImage src={null} alt="Arcor Galletitas" marca="Arcor" size="sm" />
      <ProductImage src={null} alt="Cocinero Aceite" marca="Cocinero" size="md" />
    </div>
  );
}

import { ProductTable } from 'inflacion-personal-ar';

const MOCK_PRODUCTS = [
  { ean: '7790580469000', product_description: 'Coca-Cola 1.5L', marca: 'Coca-Cola', categoria: 'Bebidas', precio_actual: 1850, variacion_pct: 4.2, cobertura_cadenas: 5, image_url: null },
  { ean: '7791337007073', product_description: 'Aceite Girasol 1.5L', marca: 'Cocinero', categoria: 'Aceites', precio_actual: 2320, variacion_pct: -1.3, cobertura_cadenas: 4, image_url: null },
  { ean: '7790310000001', product_description: 'Leche Entera 1L', marca: 'La Serenísima', categoria: 'Lácteos', precio_actual: 890, variacion_pct: 6.1, cobertura_cadenas: 6, image_url: null },
  { ean: '7790895000002', product_description: 'Fideos Tallarin 500g', marca: 'Matarazzo', categoria: 'Pastas', precio_actual: 640, variacion_pct: 0, cobertura_cadenas: 3, image_url: null },
  { ean: '7790040000003', product_description: 'Yerba Mate 500g', marca: 'Amanda', categoria: 'Infusiones', precio_actual: 1120, variacion_pct: null, cobertura_cadenas: 2, image_url: null },
];

export function Default() {
  return (
    <div className="bg-zinc-950 p-4 w-full max-w-3xl">
      <ProductTable
        products={MOCK_PRODUCTS}
        page={1}
        totalCount={5}
        pageSize={10}
        onPageChange={() => {}}
      />
    </div>
  );
}

export function WithSelection() {
  return (
    <div className="bg-zinc-950 p-4 w-full max-w-3xl">
      <ProductTable
        products={MOCK_PRODUCTS}
        page={1}
        totalCount={5}
        pageSize={10}
        onPageChange={() => {}}
        selectedEans={new Set(['7790580469000', '7790310000001'])}
      />
    </div>
  );
}

export function Loading() {
  return (
    <div className="bg-zinc-950 p-4 w-full max-w-3xl">
      <ProductTable
        products={[]}
        page={1}
        totalCount={0}
        pageSize={10}
        onPageChange={() => {}}
        loading={true}
      />
    </div>
  );
}

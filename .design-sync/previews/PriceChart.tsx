import { PriceChart } from 'inflacion-personal-ar';

const MOCK_DATA = {
  average: [
    { fecha: '2025-01-01', precio_promedio: 1200 },
    { fecha: '2025-02-01', precio_promedio: 1310 },
    { fecha: '2025-03-01', precio_promedio: 1450 },
    { fecha: '2025-04-01', precio_promedio: 1520 },
    { fecha: '2025-05-01', precio_promedio: 1680 },
    { fecha: '2025-06-01', precio_promedio: 1850 },
  ],
  byChain: {
    Coto: [
      { fecha: '2025-01-01', precio: 1150 },
      { fecha: '2025-02-01', precio: 1270 },
      { fecha: '2025-03-01', precio: 1400 },
      { fecha: '2025-04-01', precio: 1480 },
      { fecha: '2025-05-01', precio: 1620 },
      { fecha: '2025-06-01', precio: 1790 },
    ],
    Carrefour: [
      { fecha: '2025-01-01', precio: 1250 },
      { fecha: '2025-02-01', precio: 1350 },
      { fecha: '2025-03-01', precio: 1500 },
      { fecha: '2025-04-01', precio: 1560 },
      { fecha: '2025-05-01', precio: 1740 },
      { fecha: '2025-06-01', precio: 1910 },
    ],
  },
};

export function AverageOnly() {
  return (
    <div className="bg-zinc-950 p-4 w-full max-w-lg">
      <PriceChart data={MOCK_DATA} selectedChains={new Set()} />
    </div>
  );
}

export function WithChains() {
  return (
    <div className="bg-zinc-950 p-4 w-full max-w-lg">
      <PriceChart data={MOCK_DATA} selectedChains={new Set(['Coto', 'Carrefour'])} />
    </div>
  );
}

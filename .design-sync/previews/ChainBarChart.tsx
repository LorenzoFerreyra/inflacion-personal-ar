import { ChainBarChart } from 'inflacion-personal-ar';

const MOCK_CHAINS = [
  { cadena: 'Coto', total_canasta: 12400 },
  { cadena: 'Carrefour', total_canasta: 13100 },
  { cadena: 'Disco', total_canasta: 13800 },
  { cadena: 'Jumbo', total_canasta: 14200 },
  { cadena: 'La Anónima', total_canasta: 14900 },
];

export function Default() {
  return (
    <div className="bg-zinc-950 p-4 w-full max-w-lg">
      <ChainBarChart data={MOCK_CHAINS} />
    </div>
  );
}

export function Tall() {
  return (
    <div className="bg-zinc-950 p-4 w-full max-w-lg">
      <ChainBarChart
        data={[
          { cadena: 'Coto', total_canasta: 12400 },
          { cadena: 'Carrefour', total_canasta: 13100 },
          { cadena: 'Disco', total_canasta: 13800 },
          { cadena: 'Jumbo', total_canasta: 14200 },
          { cadena: 'La Anónima', total_canasta: 14900 },
          { cadena: 'Walmart', total_canasta: 15300 },
          { cadena: 'Día', total_canasta: 15800 },
        ]}
        height={320}
      />
    </div>
  );
}

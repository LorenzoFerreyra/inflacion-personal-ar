import { LoadingSpinner } from 'inflacion-personal-ar';

export function Default() {
  return (
    <div className="bg-zinc-950 p-8 w-full max-w-sm">
      <LoadingSpinner />
    </div>
  );
}

export function CustomMessage() {
  return (
    <div className="bg-zinc-950 p-8 w-full max-w-sm">
      <LoadingSpinner message="Cargando productos..." />
    </div>
  );
}

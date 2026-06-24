import { RotateCcw } from 'inflacion-personal-ar';

export function Sizes() {
  return (
    <div className="bg-zinc-900 p-8 flex items-center gap-8 rounded-xl">
      <RotateCcw size={16} className="text-zinc-500" />
      <RotateCcw size={24} className="text-zinc-300" />
      <RotateCcw size={32} className="text-zinc-100" />
    </div>
  );
}

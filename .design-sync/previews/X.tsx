import { X } from 'inflacion-personal-ar';

export function Sizes() {
  return (
    <div className="bg-zinc-900 p-8 flex items-center gap-8 rounded-xl">
      <X size={16} className="text-zinc-500" />
      <X size={24} className="text-red-400" />
      <X size={32} className="text-red-300" />
    </div>
  );
}

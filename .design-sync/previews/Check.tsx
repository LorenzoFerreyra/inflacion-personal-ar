import { Check } from 'inflacion-personal-ar';

export function Sizes() {
  return (
    <div className="bg-zinc-900 p-8 flex items-center gap-8 rounded-xl">
      <Check size={16} className="text-green-500" />
      <Check size={24} className="text-green-400" />
      <Check size={32} className="text-green-300" />
    </div>
  );
}

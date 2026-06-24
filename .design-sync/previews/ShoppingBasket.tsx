import { ShoppingBasket } from 'inflacion-personal-ar';

export function Sizes() {
  return (
    <div className="bg-zinc-900 p-8 flex items-center gap-8 rounded-xl">
      <ShoppingBasket size={16} className="text-amber-500" />
      <ShoppingBasket size={24} className="text-amber-400" />
      <ShoppingBasket size={32} className="text-amber-300" />
    </div>
  );
}

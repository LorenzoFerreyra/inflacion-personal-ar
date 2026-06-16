export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-8 h-8 border-2 border-zinc-700 border-t-amber-400 rounded-full animate-spin" />
      <span className="text-sm text-zinc-500">Cargando...</span>
    </div>
  );
}

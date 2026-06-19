/**
 * Reusable loading spinner with optional message.
 * Extracted from ProductTable.tsx and other components.
 */

interface Props {
  message?: string;
}

export default function LoadingSpinner({ message = "Cargando..." }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-8 h-8 border-2 border-zinc-700 border-t-amber-400 rounded-full animate-spin" />
      <span className="text-sm text-zinc-500">{message}</span>
    </div>
  );
}

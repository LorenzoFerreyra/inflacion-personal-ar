export interface LoadingSpinnerProps {
  message?: string;
}

export default function LoadingSpinner({ message = "Loading..." }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-7 h-7 border-[1.5px] border-zinc-700/60 border-t-amber-400/80 rounded-full animate-spin" />
      <span className="text-sm text-zinc-400">{message}</span>
    </div>
  );
}

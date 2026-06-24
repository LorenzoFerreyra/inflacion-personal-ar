import type { ReactNode } from "react";

export interface EmptyStateProps {
  message: string;
  icon?: ReactNode;
}

export default function EmptyState({ message, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-zinc-500 gap-4">
      {icon && <div className="text-zinc-600">{icon}</div>}
      <span className="text-sm text-zinc-400">{message}</span>
    </div>
  );
}

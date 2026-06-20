import type { ReactNode } from "react";

/**
 * Empty state placeholder with an optional icon and message.
 * Extracted from ProductTable.tsx.
 */

interface Props {
  message: string;
  icon?: ReactNode;
}

export default function EmptyState({ message, icon }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-zinc-500 gap-4">
      {icon && <div className="text-zinc-600">{icon}</div>}
      <span className="text-sm text-zinc-400">{message}</span>
    </div>
  );
}

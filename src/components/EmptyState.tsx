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
    <div className="flex flex-col items-center justify-center py-16 text-zinc-500 gap-3">
      {icon}
      <span className="text-sm">{message}</span>
    </div>
  );
}

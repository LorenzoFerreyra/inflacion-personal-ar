"use client";

import dynamic from "next/dynamic";
import type { Branch } from "@/lib/types";

const BranchMap = dynamic(() => import("./BranchMap"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-140">
      <p className="text-sm text-zinc-500">Cargando mapa…</p>
    </div>
  ),
});

interface Props {
  branches: Branch[];
  chains: { id: string; name: string; color: string }[];
}

export default function BranchMapLoader({ branches, chains }: Props) {
  return <BranchMap branches={branches} chains={chains} />;
}

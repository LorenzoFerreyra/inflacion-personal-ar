import type { Metadata } from "next";
import IndicesView from "@/components/IndicesView";

export const metadata: Metadata = {
  title: "Índices por clase · Observatorio de inflación",
  description:
    "Índice de precios de supermercados por clase COICOP comparado con el IPC del INDEC (GBA).",
};

export default function IndicesPage() {
  return <IndicesView />;
}

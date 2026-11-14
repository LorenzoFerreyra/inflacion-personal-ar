import type { Metadata } from "next";
import VariedadesView from "@/components/VariedadesView";

export const metadata: Metadata = {
  title: "Precios del INDEC vs. supermercados · Observatorio de inflación",
  description:
    "Precio promedio del INDEC (GBA) de 59 productos comparado con los mismos productos en supermercados.",
};

export default function VariedadesPage() {
  return <VariedadesView />;
}

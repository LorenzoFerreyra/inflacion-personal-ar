"use client";

import { useEffect, useRef, useState } from "react";
import type { Branch } from "@/lib/types";

interface Props {
  branches: Branch[];
  chains: { id: string; name: string; color: string }[];
}

const CHAIN_COLORS: Record<string, string> = {};

export default function BranchMap({ branches, chains }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletMap = useRef<any>(null);
  const [ready, setReady] = useState(false);

  for (const c of chains) CHAIN_COLORS[c.id] = c.color;

  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      if (cancelled || !mapRef.current) return;

      const map = L.map(mapRef.current, {
        center: [-34.6, -58.45],
        zoom: 5,
        zoomControl: true,
        attributionControl: true,
      });

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
          subdomains: "abcd",
          maxZoom: 19,
        },
      ).addTo(map);

      for (const b of branches) {
        const color = CHAIN_COLORS[b.cadena] ?? "#888";
        const icon = L.divIcon({
          className: "",
          html: `<div style="
            width:10px;height:10px;
            background:${color};
            border:1.5px solid rgba(255,255,255,0.5);
            border-radius:2px;
            transform:rotate(45deg);
            box-shadow:0 0 4px ${color}80;
          "></div>`,
          iconSize: [10, 10],
          iconAnchor: [5, 5],
        });

        L.marker([b.latitud, b.longitud], { icon }).addTo(map).bindPopup(
          `<div style="font-family:system-ui;font-size:12px;line-height:1.4">
            <strong style="font-size:13px">${chainLabel(b.cadena)}</strong>
            <span style="opacity:0.6;margin-left:4px;font-size:11px">${b.formato}</span>
            <br/>${b.direccion}
            <br/><span style="opacity:0.7">${b.localidad}, ${b.provincia}</span>
          </div>`,
          { closeButton: false, className: "branch-popup" },
        );
      }

      if (branches.length > 0) {
        const bounds = L.latLngBounds(
          branches.map((b) => [b.latitud, b.longitud] as [number, number]),
        );
        map.fitBounds(bounds, { padding: [30, 30] });
      }

      leafletMap.current = map;
      setReady(true);
    })();

    return () => {
      cancelled = true;
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, [branches]);

  return (
    <div className="relative w-full h-full min-h-[560px]">
      <div ref={mapRef} className="absolute inset-0 rounded-xl" />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-zinc-500">Cargando mapa…</p>
        </div>
      )}
    </div>
  );
}

function chainLabel(id: string): string {
  return id
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

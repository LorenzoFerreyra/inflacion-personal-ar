"use client";

import React, { useEffect, useRef, useState } from "react";
import type { Branch } from "@/lib/types";
import type { Map, LayerGroup } from "leaflet";
import { chainLabel } from "@/lib/chainColors";

/** Escapa HTML para prevenir XSS en contenido generado dinámicamente. */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/** Verifica que el color sea un valor CSS hex válido (con #) para prevenir inyección. */
function sanitizeColor(color: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : "#888";
}

interface Props {
  branches: Branch[];
  chains: { id: string; name: string; color: string }[];
}

export default function BranchMap({ branches, chains }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<Map | null>(null);
  const markersLayer = useRef<LayerGroup | null>(null);
  const [ready, setReady] = useState(false);

  const chainColors = React.useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of chains) map[c.id] = c.color;
    return map;
  }, [chains]);

  // ── Map initialization (runs once) ──────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    let cancelled = false;

    (async () => {
      try {
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

        const layer = L.layerGroup().addTo(map);
        markersLayer.current = layer;
        leafletMap.current = map;
        setReady(true);
      } catch {
        // Leaflet failed to load — map will show loading fallback
      }
    })();

    return () => {
      cancelled = true;
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
        markersLayer.current = null;
      }
    };
  }, []);

  // ── Marker updates (runs when data changes) ─────────────────────────────
  useEffect(() => {
    const map = leafletMap.current;
    const layer = markersLayer.current;
    if (!map || !layer || !ready) return;

    // Import L to create markers (already cached by dynamic import).
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled) return;

      layer.clearLayers();

      for (const b of branches) {
        const color = sanitizeColor(chainColors[b.cadena] ?? "#888");
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

        L.marker([b.latitud, b.longitud], { icon })
          .addTo(layer)
          .bindPopup(
            `<div style="font-family:system-ui;font-size:12px;line-height:1.4">
            <strong style="font-size:13px">${escapeHtml(chainLabel(b.cadena))}</strong>
            <span style="opacity:0.6;margin-left:4px;font-size:11px">${escapeHtml(b.formato)}</span>
            <br/>${escapeHtml(b.direccion)}
            <br/><span style="opacity:0.7">${escapeHtml(b.localidad)}, ${escapeHtml(b.provincia)}</span>
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
    })();

    return () => {
      cancelled = true;
    };
  }, [branches, chainColors, ready]);

  return (
    <div className="relative w-full h-full min-h-140">
      <div ref={mapRef} className="absolute inset-0 rounded-xl" />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-zinc-500">Cargando mapa…</p>
        </div>
      )}
    </div>
  );
}

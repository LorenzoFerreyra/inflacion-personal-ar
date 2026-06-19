"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { djb2Hash } from "@/lib/chainColors";

interface Props {
  src: string | null;
  alt: string;
  marca: string;
  size?: "sm" | "md";
}

const brandColorCache: Record<string, string> = {};

function brandColor(marca: string): string {
  const cached = brandColorCache[marca];
  if (cached) return cached;

  const hue = ((djb2Hash(marca) % 360) + 360) % 360;
  const color = `hsl(${hue}, 45%, 35%)`;
  brandColorCache[marca] = color;
  return color;
}

function initials(marca: string): string {
  return marca
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export default function ProductImage({ src, alt, marca, size = "sm" }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Resetea el error de imagen cuando cambia la fuente.
  useEffect(() => {
    queueMicrotask(() => setImgError(false));
  }, [src]);

  const px = size === "sm" ? 28 : 36;
  const hasImage = src && !imgError;

  const close = useCallback(() => setExpanded(false), []);

  useEffect(() => {
    if (!expanded) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [expanded, close]);

  function handleClick(e: React.MouseEvent) {
    if (!hasImage) return;
    e.stopPropagation();
    setExpanded(true);
  }

  return (
    <>
      <div
        className="relative shrink-0"
        onClick={handleClick}
        style={{ cursor: hasImage ? "pointer" : "default" }}
      >
        {hasImage ? (
          <div
            className="rounded-md overflow-hidden border border-zinc-700/40 bg-zinc-800/60"
            style={{ width: px, height: px }}
          >
            <Image
              src={src}
              alt={alt}
              width={px}
              height={px}
              className="object-cover w-full h-full"
              onError={() => setImgError(true)}
            />
          </div>
        ) : (
          <div
            className="rounded-md flex items-center justify-center text-[10px] font-bold text-white/70 select-none"
            style={{
              width: px,
              height: px,
              backgroundColor: brandColor(marca || "?"),
            }}
          >
            {initials(marca || "?")}
          </div>
        )}
      </div>

      {expanded &&
        hasImage &&
        createPortal(
          <div className="image-lightbox" onClick={close}>
            <div
              className="image-lightbox-card"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={src}
                alt={alt}
                width={600}
                height={600}
                className="image-lightbox-img"
              />
              <div className="px-4 py-3 border-t border-zinc-800/60">
                <p className="text-[13px] text-zinc-200 font-medium leading-snug line-clamp-2">
                  {alt}
                </p>
                <p className="text-[11px] text-zinc-500 mt-1">{marca}</p>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";

interface Props {
  src: string | null;
  alt: string;
  marca: string;
  size?: "sm" | "md";
}

const BRAND_COLORS: Record<string, string> = {};
function brandColor(marca: string): string {
  if (BRAND_COLORS[marca]) return BRAND_COLORS[marca];
  let hash = 0;
  for (let i = 0; i < marca.length; i++) {
    hash = marca.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = ((hash % 360) + 360) % 360;
  const color = `hsl(${h}, 45%, 35%)`;
  BRAND_COLORS[marca] = color;
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
  const [showPreview, setShowPreview] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [previewPos, setPreviewPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const thumbRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const px = size === "sm" ? 28 : 36;
  const hasImage = src && !imgError;

  function handleEnter() {
    if (!hasImage) return;
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (thumbRef.current) {
        const rect = thumbRef.current.getBoundingClientRect();
        setPreviewPos({ x: rect.right + 8, y: rect.top - 40 });
      }
      setShowPreview(true);
    }, 300);
  }

  function handleLeave() {
    clearTimeout(timeoutRef.current);
    setShowPreview(false);
  }

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  return (
    <div
      ref={thumbRef}
      className="relative flex-shrink-0"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {hasImage ? (
        <div
          className="rounded-md overflow-hidden border border-zinc-700/40 bg-zinc-800/60"
          style={{ width: px, height: px }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            width={px}
            height={px}
            className="object-cover w-full h-full"
            loading="lazy"
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

      {showPreview && hasImage && (
        <div
          className="product-preview-float"
          style={{
            position: "fixed",
            left: previewPos.x,
            top: previewPos.y,
            zIndex: 50,
          }}
        >
          <div className="w-48 rounded-xl overflow-hidden border border-zinc-700/50 bg-zinc-900/95 backdrop-blur-xl shadow-2xl shadow-black/50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              className="w-full h-48 object-contain bg-white/5 p-2"
            />
            <div className="px-3 py-2.5 border-t border-zinc-800/60">
              <p className="text-[11px] text-zinc-300 font-medium leading-tight line-clamp-2">
                {alt}
              </p>
              <p className="text-[10px] text-zinc-500 mt-0.5">{marca}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

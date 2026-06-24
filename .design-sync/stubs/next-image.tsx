import React from 'react';

interface ImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  onError?: React.ReactEventHandler<HTMLImageElement>;
  style?: React.CSSProperties;
  fill?: boolean;
  priority?: boolean;
  [key: string]: unknown;
}

export default function Image({ src, alt, width, height, className, onError, style }: ImageProps) {
  return React.createElement('img', { src, alt, width, height, className, onError, style });
}

import React from 'react';

interface LinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  [key: string]: unknown;
}

export default function Link({ href, children, className, ...rest }: LinkProps) {
  const safeRest = rest as Record<string, unknown>;
  return React.createElement('a', { href, className, ...safeRest }, children);
}

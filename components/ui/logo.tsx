'use client';

import { useTheme } from 'next-themes';
import Image from 'next/image';
import { useEffect, useState } from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = {
  sm: { width: 40, height: 40 },
  md: { width: 60, height: 60 },
  lg: { width: 80, height: 80 },
  xl: { width: 120, height: 120 },
};

export function Logo({ size = 'md', className = '' }: LogoProps) {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div
        className={className}
        style={{
          width: sizeMap[size].width,
          height: sizeMap[size].height,
        }}
      />
    );
  }

  const isDark = resolvedTheme === 'dark' || theme === 'dark';
  const logoSrc = isDark
    ? '/Lewis_Retails_logo_2.png'
    : '/Lewis_Retails_logo_1.png';

  return (
    <Image
      src={logoSrc}
      alt="Lewis Retails Logo"
      width={sizeMap[size].width}
      height={sizeMap[size].height}
      className={className}
      priority
    />
  );
}


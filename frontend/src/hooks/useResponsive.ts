'use client';

import { useEffect, useState } from 'react';

interface Breakpoints {
  isMobile: boolean;   // < 768px
  isTablet: boolean;   // 768–1023px
  isDesktop: boolean;  // >= 1024px
  width: number;
}

const getBreakpoints = (width: number): Breakpoints => ({
  isMobile: width < 768,
  isTablet: width >= 768 && width < 1024,
  isDesktop: width >= 1024,
  width,
});

export function useResponsive(): Breakpoints {
  const [bp, setBp] = useState<Breakpoints>(() =>
    typeof window !== 'undefined'
      ? getBreakpoints(window.innerWidth)
      : { isMobile: false, isTablet: false, isDesktop: true, width: 1280 },
  );

  useEffect(() => {
    const handler = () => setBp(getBreakpoints(window.innerWidth));
    window.addEventListener('resize', handler);
    handler();
    return () => window.removeEventListener('resize', handler);
  }, []);

  return bp;
}

/** Returns a responsive modal/drawer width: full-bleed on phones, capped on desktop. */
export function useModalWidth(desktopWidth = 600): number {
  const { width, isMobile } = useResponsive();
  if (isMobile) return Math.min(width - 32, desktopWidth);
  return desktopWidth;
}

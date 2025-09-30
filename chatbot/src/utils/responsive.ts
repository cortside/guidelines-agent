/**
 * Responsive design utilities and breakpoint helpers
 */

export const breakpoints = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
} as const;

/**
 * Check if the viewport matches a media query
 */
export function useMediaQuery(query: string): boolean {
  if (typeof window === "undefined") return false;

  try {
    return window.matchMedia(query).matches;
  } catch {
    return false;
  }
}

/**
 * Get responsive sidebar width based on viewport
 */
export function getResponsiveSidebarWidth(): string {
  if (typeof window === "undefined") return "16rem"; // 64 in Tailwind

  const width = window.innerWidth;

  if (width < 768) return "0"; // Hidden on mobile
  if (width < 1024) return "12rem"; // 48 in Tailwind for tablet
  return "16rem"; // 64 in Tailwind for desktop
}

/**
 * Check if device has touch capabilities
 */
export function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;

  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}

/**
 * Get optimal message width based on viewport
 */
export function getResponsiveMessageWidth(): string {
  if (typeof window === "undefined") return "max-w-lg";

  const width = window.innerWidth;

  if (width < 640) return "max-w-xs"; // Smaller on mobile
  if (width < 768) return "max-w-sm"; // Medium on small tablet
  if (width < 1024) return "max-w-md"; // Larger on tablet
  return "max-w-lg"; // Full size on desktop
}

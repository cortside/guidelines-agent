import { useState, useEffect } from "react";

/**
 * Hook to track window dimensions and provide responsive breakpoint information
 */
export function useResponsive() {
  const [dimensions, setDimensions] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 1024,
    height: typeof window !== "undefined" ? window.innerHeight : 768,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);

    // Set initial values
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile = dimensions.width < 768;
  const isTablet = dimensions.width >= 768 && dimensions.width < 1024;
  const isDesktop = dimensions.width >= 1024;
  const isLargeScreen = dimensions.width >= 1280;

  // Responsive class calculations
  const getSidebarWidth = () => {
    if (isMobile) return "w-0";
    if (isTablet) return "w-48";
    return "w-64";
  };

  const getMessageMaxWidth = () => {
    if (isMobile) return "max-w-xs";
    if (isTablet) return "max-w-md";
    return "max-w-lg";
  };

  const getPadding = () => {
    if (isMobile) return "p-2";
    if (isTablet) return "p-3";
    return "p-4";
  };

  return {
    width: dimensions.width,
    height: dimensions.height,
    isMobile,
    isTablet,
    isDesktop,
    isLargeScreen,
    // Responsive classes
    sidebarWidth: getSidebarWidth(),
    messageMaxWidth: getMessageMaxWidth(),
    padding: getPadding(),
  };
}

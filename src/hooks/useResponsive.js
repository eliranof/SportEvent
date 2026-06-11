import { useEffect, useState } from "react";

function getViewportWidth() {
  if (typeof window === "undefined") {
    return 1440;
  }

  return window.innerWidth || document.documentElement.clientWidth || 1440;
}

export default function useResponsive(breakpoint = 768) {
  const [viewportWidth, setViewportWidth] = useState(getViewportWidth);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handleResize = () => {
      setViewportWidth(getViewportWidth());
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, []);

  return {
    viewportWidth,
    isMobile: viewportWidth <= breakpoint,
    isTablet: viewportWidth <= 1024,
  };
}

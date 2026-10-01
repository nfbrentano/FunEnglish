"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";

/** Fullscreen for the player; while active, the root font grows so everything reads from the back row. */
export function useFullscreen(target: RefObject<HTMLElement | null>) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const onChange = () => {
      const on = document.fullscreenElement === target.current && target.current !== null;
      setActive(on);
      document.documentElement.style.fontSize = on ? "125%" : "";
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.documentElement.style.fontSize = "";
    };
  }, [target]);

  const toggle = useCallback(async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await target.current?.requestFullscreen?.();
  }, [target]);

  const supported = typeof document !== "undefined" && document.fullscreenEnabled !== false;
  return { active, toggle, supported };
}

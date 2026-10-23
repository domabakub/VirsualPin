"use client";

import { useEffect } from "react";

/** Resume inside ordinary user gestures, including after an OS audio interruption. */
export function useAutomaticAudio(unlock: () => Promise<boolean>) {
  useEffect(() => {
    let pending = false;
    const resume = () => {
      if (pending) return;
      pending = true;
      void unlock().finally(() => { pending = false; });
    };
    window.addEventListener("pointerdown", resume, true);
    window.addEventListener("touchend", resume, true);
    window.addEventListener("keydown", resume, true);
    return () => {
      window.removeEventListener("pointerdown", resume, true);
      window.removeEventListener("touchend", resume, true);
      window.removeEventListener("keydown", resume, true);
    };
  }, [unlock]);
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { listQuickTakes, QUICK_TAKES_CHANGED } from "@/lib/takes/storage";
import type { QuickTake } from "@/lib/takes/types";

export function useQuickTakes() {
  const [takes, setTakes] = useState<QuickTake[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setTakes(await listQuickTakes());
      setError(null);
    } catch {
      setError("อ่านบันทึกการเล่นไม่สำเร็จ");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => { void refresh(); }, 0);
    const onChange = () => { void refresh(); };
    window.addEventListener(QUICK_TAKES_CHANGED, onChange);
    return () => {
      window.clearTimeout(initial);
      window.removeEventListener(QUICK_TAKES_CHANGED, onChange);
    };
  }, [refresh]);

  return { takes, loading, error, refresh };
}

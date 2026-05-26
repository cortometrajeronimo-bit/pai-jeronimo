"use client";

import { useEffect, useState } from "react";
import { flushQueue, pendingCount } from "@/lib/offline-sync";

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(true);
  const [syncPending, setSyncPending] = useState(0);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    // Estado inicial
    setIsOnline(navigator.onLine);
    pendingCount().then(setSyncPending);

    const handleOnline = async () => {
      setIsOnline(true);
      const count = await pendingCount();
      if (count > 0) {
        await flushQueue();
        setSyncPending(0);
        setLastSync(new Date());
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      pendingCount().then(setSyncPending);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { isOnline, syncPending, lastSync };
}

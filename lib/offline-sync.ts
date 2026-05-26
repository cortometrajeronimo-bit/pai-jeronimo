import { dequeueAll, removeFromQueue, queueSize } from "./offline-db";
import { createClient } from "./supabase/client";

export async function flushQueue(): Promise<{ synced: number; failed: number }> {
  const pending = await dequeueAll();
  if (pending.length === 0) return { synced: 0, failed: 0 };

  const supabase = createClient();
  let synced = 0;
  let failed = 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  for (const item of pending) {
    try {
      if (item.action === "insert") {
        const { error } = await db.from(item.table).insert(item.payload);
        if (error) throw error;
      } else if (item.action === "update") {
        const p = item.payload as { id: string; [k: string]: unknown };
        const { error } = await db.from(item.table).update(p).eq("id", p.id);
        if (error) throw error;
      } else if (item.action === "delete") {
        const { error } = await db.from(item.table).delete().eq("id", (item.payload as { id: string }).id);
        if (error) throw error;
      }
      await removeFromQueue(item.id!);
      synced++;
    } catch {
      failed++;
    }
  }

  return { synced, failed };
}

export async function pendingCount(): Promise<number> {
  return queueSize();
}

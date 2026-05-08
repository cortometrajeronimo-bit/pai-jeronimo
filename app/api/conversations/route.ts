// Endpoint para paginar conversaciones por project_id
// GET /api/conversations?projectId=…&before=…&limit=50

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId");
  const before = url.searchParams.get("before"); // ISO timestamp
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 100);

  if (!projectId) {
    return NextResponse.json({ error: "projectId requerido" }, { status: 400 });
  }

  const supabase = await createClient();
  let q = supabase
    .from("conversations")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (before) q = q.lt("created_at", before);

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: (data ?? []).reverse() });
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId requerido" }, { status: 400 });
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("conversations")
    .delete()
    .eq("project_id", projectId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

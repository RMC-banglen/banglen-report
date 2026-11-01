// Supabase: ใช้ตาราง worktrack_users ของเว็บเดิม (ล็อกอิน) และ wedge_panel_projects (โครงการ)
// โครงการเก็บเป็นข้อมูลฟอร์ม JSON เท่านั้น ไม่เก็บผลคำนวณ ไม่เก็บ PDF
import { SUPABASE_URL, SUPABASE_KEY, TABLE_PROJECTS } from "./config.js?v=20261101095130";

let client = null;
export function db() {
  if (!client) client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  return client;
}

export async function listUsers() {
  const { data, error } = await db().from("worktrack_users").select("*")
    .order("sort_order", { ascending: true, nullsFirst: false }).order("created_at");
  if (error) throw error;
  return (data || []).filter((u) => u.active !== false);
}

export async function refreshUser(id) {
  const { data } = await db().from("worktrack_users").select("*").eq("id", id).single();
  return data || null;
}

export async function listProjects(limit = 30) {
  const { data, error } = await db().from(TABLE_PROJECTS)
    .select("id,name,customer,seller,project_date,updated_at,updated_by")
    .order("updated_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return data || [];
}

export async function getProject(id) {
  const { data, error } = await db().from(TABLE_PROJECTS).select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

// form = ข้อมูลฟอร์มทั้งหมด (JSON) คืน id ของโครงการ
export async function saveProject({ id, form, user }) {
  const row = {
    id: id || "p-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: String(form.pj || "").trim(),
    customer: String(form.cu || "").trim() || null,
    seller: String(form.sa || "").trim() || null,
    data: form,
    updated_at: new Date().toISOString(),
    updated_by: user?.name || null,
  };
  if (!id) row.created_by = user?.name || null;
  const { error } = await db().from(TABLE_PROJECTS).upsert(row);
  if (error) throw error;
  return row.id;
}

// ลบโครงการถาวร (เรียกหลังผู้ใช้ยืนยันแล้วเท่านั้น)
export async function deleteProject(id) {
  const { error } = await db().from(TABLE_PROJECTS).delete().eq("id", id);
  if (error) throw error;
}

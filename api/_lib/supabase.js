// ============================================================
// Supabase Admin Client (server-side)
// Uses service role key for full access, bypasses RLS
// ============================================================
import { createClient } from '@supabase/supabase-js';

export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
  }

  return createClient(url, serviceKey);
}

/**
 * Verify the request is from an authenticated admin.
 * Extracts the JWT from Authorization header, verifies with Supabase,
 * then checks the admins table.
 */
export async function verifyAdmin(req) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;

  const token = auth.slice(7);
  const supabase = getSupabaseAdmin();

  // Verify JWT and get user
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;

  // Check admins table
  const { data: admin } = await supabase
    .from('admins')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();

  return admin || null;
}
// ============================================================
// Authentication
// ============================================================
import { supabase } from './supabase.js';
import { showToast } from './toast.js';

let currentUser = null;
let currentAdmin = null;

export function getUser() { return currentUser; }
export function getAdmin() { return currentAdmin; }

export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;

  const admin = await fetchAdmin(data.user.id);
  if (!admin) {
    await supabase.auth.signOut();
    throw new Error('Your account is not authorized to access this panel.');
  }

  currentUser = data.user;
  currentAdmin = admin;
  return { user: currentUser, admin: currentAdmin };
}

export async function signup(email, password) {
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
}

export async function logout() {
  await supabase.auth.signOut();
  currentUser = null;
  currentAdmin = null;
}

export async function checkSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const admin = await fetchAdmin(session.user.id);
  if (!admin) return null;

  currentUser = session.user;
  currentAdmin = admin;
  return { user: currentUser, admin: currentAdmin };
}

async function fetchAdmin(userId) {
  const { data, error } = await supabase
    .from('admins')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  if (error || !data) return null;
  return data;
}
// ============================================================
// /api/bookings — Admin CRUD with PII encryption/decryption
// ============================================================
import { getSupabaseAdmin, verifyAdmin } from './_lib/supabase.js';
import { encryptBookingPII, decryptBookingPII } from './_lib/crypto.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const admin = await verifyAdmin(req);
  if (!admin) return res.status(401).json({ error: 'Unauthorized' });

  const supabase = getSupabaseAdmin();

  try {
    switch (req.method) {
      case 'GET':    return await handleGet(req, res, supabase);
      case 'POST':   return await handlePost(req, res, supabase);
      case 'PUT':    return await handlePut(req, res, supabase);
      case 'DELETE':  return await handleDelete(req, res, supabase);
      default:       return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (err) {
    console.error('Admin bookings API error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}

// ============================================================
// GET — list bookings (decrypted)
// ============================================================
async function handleGet(req, res, supabase) {
  const { date, section, status, search } = req.query;

  let query = supabase
    .from('bookings')
    .select('*, services(name)')
    .order('time_slot', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });

  if (date) query = query.eq('booking_date', date);
  if (section && section !== 'all') query = query.eq('section', section);
  if (status && status !== 'all') query = query.eq('status', status);
  if (search) query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`);

  const { data, error } = await query;
  if (error) return res.status(400).json({ error: error.message });

  const decrypted = (data || []).map(b => {
    try { return decryptBookingPII(b); }
    catch { return b; }
  });

  return res.status(200).json(decrypted);
}

// ============================================================
// POST — create booking (encrypt PII)
// ============================================================
async function handlePost(req, res, supabase) {
  const body = req.body;

  if (!body.first_name || !body.last_name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  if (!body.service_id || !body.booking_date) {
    return res.status(400).json({ error: 'Service and date are required' });
  }

  const encrypted = encryptBookingPII(body);

  const { data, error } = await supabase
    .from('bookings')
    .insert(encrypted)
    .select('*, services(name)')
    .single();

  if (error) return res.status(400).json({ error: error.message });
  return res.status(201).json(decryptBookingPII(data));
}

// ============================================================
// PUT — update booking (encrypt PII fields if present)
// ============================================================
async function handlePut(req, res, supabase) {
  const { id, ...updates } = req.body;
  if (!id) return res.status(400).json({ error: 'Booking ID is required' });

  // Only encrypt PII fields if they're present and non-empty
  if (updates.phone_encrypted) {
    const { encrypt } = await import('./_lib/crypto.js');
    updates.phone_encrypted = encrypt(updates.phone_encrypted);
  }
  if (updates.email_encrypted) {
    const { encrypt } = await import('./_lib/crypto.js');
    updates.email_encrypted = encrypt(updates.email_encrypted);
  }
  if (updates.dob_encrypted) {
    const { encrypt } = await import('./_lib/crypto.js');
    updates.dob_encrypted = encrypt(updates.dob_encrypted);
  }

  const { data, error } = await supabase
    .from('bookings')
    .update(updates)
    .eq('id', id)
    .select('*, services(name)')
    .single();

  if (error) return res.status(400).json({ error: error.message });
  return res.status(200).json(decryptBookingPII(data));
}

// ============================================================
// DELETE — cancel booking (soft delete)
// ============================================================
async function handleDelete(req, res, supabase) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Booking ID is required' });

  const { data, error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .select('*, services(name)')
    .single();

  if (error) return res.status(400).json({ error: error.message });
  return res.status(200).json(decryptBookingPII(data));
}

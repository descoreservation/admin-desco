// ============================================================
// /api/export — CSV export with decrypted PII
// ============================================================
import { getSupabaseAdmin, verifyAdmin } from './_lib/supabase.js';
import { decryptBookingPII } from './_lib/crypto.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const admin = await verifyAdmin(req);
  if (!admin) return res.status(401).json({ error: 'Unauthorized' });

  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'Date is required' });

  const supabase = getSupabaseAdmin();

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('*, services(name)')
    .eq('booking_date', date)
    .order('time_slot');

  if (error) return res.status(400).json({ error: error.message });
  if (!bookings?.length) return res.status(404).json({ error: 'No bookings found' });

  // Decrypt
  const decrypted = bookings.map(b => {
    try {
      return decryptBookingPII(b);
    } catch {
      return b;
    }
  });

  // Build CSV
  const headers = ['Time', 'First Name', 'Last Name', 'Phone', 'Email', 'DOB', 'Section', 'Service', 'Party Size', 'Status', 'Source', 'Notes'];
  const rows = decrypted.map(b => [
    b.time_slot?.slice(0, 5) || '',
    b.first_name,
    b.last_name,
    b.phone_encrypted,
    b.email_encrypted,
    b.dob_encrypted,
    b.section,
    b.services?.name || '',
    b.party_size,
    b.status,
    b.source,
    b.notes || '',
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));

  const csv = [headers.join(','), ...rows].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="desco-bookings-${date}.csv"`);
  return res.status(200).send(csv);
}
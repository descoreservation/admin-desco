// ============================================================
// Bookings Page
// ============================================================
import { supabase } from '../lib/supabase.js';
import { showToast } from '../lib/toast.js';
import { openModal, confirmDialog } from '../lib/modal.js';

let filters = {
  date: new Date().toISOString().split('T')[0],
  section: 'all',
  status: 'confirmed',
  search: '',
};

export async function render(container, actionsContainer) {
  // Header actions
  actionsContainer.innerHTML = `
    <div class="flex items-center gap-2">
      <button id="export-btn" class="px-4 py-2 border border-desco-200 text-desco-600 text-sm font-medium rounded-lg hover:bg-white transition-all flex items-center gap-2">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
        Export
      </button>
      <button id="add-booking-btn" class="px-4 py-2 bg-desco-900 text-white text-sm font-medium rounded-lg hover:bg-desco-800 transition-all flex items-center gap-2">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
        </svg>
        New Booking
      </button>
    </div>
  `;

  document.getElementById('add-booking-btn').addEventListener('click', () => openBookingForm(null, refresh));
  document.getElementById('export-btn').addEventListener('click', exportBookings);

  const refresh = () => loadBookings(container);

  // Render filters + empty table
  container.innerHTML = `
    <div class="fade-in space-y-4">
      <!-- Filters -->
      <div class="flex items-center gap-3 flex-wrap">
        <input id="f-date" type="date" value="${filters.date}"
          class="px-3 py-2 border border-desco-200 rounded-lg text-sm bg-white"/>
        <select id="f-section" class="px-3 py-2 border border-desco-200 rounded-lg text-sm bg-white">
          <option value="all">All sections</option>
          <option value="dining" ${filters.section === 'dining' ? 'selected' : ''}>Dining</option>
          <option value="walkin" ${filters.section === 'walkin' ? 'selected' : ''}>Walk-in</option>
        </select>
        <select id="f-status" class="px-3 py-2 border border-desco-200 rounded-lg text-sm bg-white">
          <option value="confirmed" ${filters.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
          <option value="cancelled" ${filters.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
          <option value="all">All</option>
        </select>
        <input id="f-search" type="text" value="${filters.search}" placeholder="Search by name..."
          class="px-3 py-2 border border-desco-200 rounded-lg text-sm bg-white w-48"/>
      </div>

      <!-- Bookings table -->
      <div id="bookings-table"></div>
    </div>
  `;

  // Filter listeners
  ['f-date', 'f-section', 'f-status'].forEach(id => {
    document.getElementById(id).addEventListener('change', () => {
      updateFilters();
      loadBookings(container);
    });
  });

  document.getElementById('f-search').addEventListener('input', debounce(() => {
    updateFilters();
    loadBookings(container);
  }, 300));

  loadBookings(container);
}

function updateFilters() {
  filters.date = document.getElementById('f-date').value;
  filters.section = document.getElementById('f-section').value;
  filters.status = document.getElementById('f-status').value;
  filters.search = document.getElementById('f-search').value.trim();
}

async function loadBookings(container) {
  const tableEl = document.getElementById('bookings-table');
  if (!tableEl) return;

  tableEl.innerHTML = `<p class="text-desco-400 text-sm py-4">Loading...</p>`;

  let query = supabase
    .from('bookings')
    .select('*, services(name)')
    .eq('booking_date', filters.date)
    .order('time_slot', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });

  if (filters.section !== 'all') query = query.eq('section', filters.section);
  if (filters.status !== 'all') query = query.eq('status', filters.status);
  if (filters.search) {
    query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%`);
  }

  const { data: bookings, error } = await query;

  if (error) {
    tableEl.innerHTML = `<p class="text-red-500 text-sm">Error: ${error.message}</p>`;
    return;
  }

  if (!bookings?.length) {
    tableEl.innerHTML = `
      <div class="bg-white rounded-xl border border-desco-200 p-8 text-center">
        <p class="text-desco-400 text-sm">No bookings found for this date.</p>
      </div>
    `;
    return;
  }

  // Summary
  const confirmed = bookings.filter(b => b.status === 'confirmed');
  const totalCovers = confirmed.reduce((sum, b) => sum + b.party_size, 0);
  const diningCovers = confirmed.filter(b => b.section === 'dining').reduce((sum, b) => sum + b.party_size, 0);
  const walkinCovers = confirmed.filter(b => b.section === 'walkin').reduce((sum, b) => sum + b.party_size, 0);

  const refresh = () => loadBookings(container);

  tableEl.innerHTML = `
    <!-- Summary -->
    <div class="flex items-center gap-6 mb-4 text-xs text-desco-500">
      <span><strong class="text-desco-900 text-sm">${bookings.length}</strong> bookings</span>
      <span><strong class="text-desco-900 text-sm">${totalCovers}</strong> total covers</span>
      ${diningCovers ? `<span>Dining: <strong class="text-desco-700">${diningCovers}</strong></span>` : ''}
      ${walkinCovers ? `<span>Walk-in: <strong class="text-desco-700">${walkinCovers}</strong></span>` : ''}
    </div>

    <!-- Table -->
    <div class="bg-white rounded-xl border border-desco-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-desco-50 border-b border-desco-200 text-[10px] font-medium text-desco-400 uppercase tracking-wider">
              <th class="px-4 py-3 text-left">Time</th>
              <th class="px-4 py-3 text-left">Guest</th>
              <th class="px-4 py-3 text-left">Section</th>
              <th class="px-4 py-3 text-left">Service</th>
              <th class="px-4 py-3 text-center">Pax</th>
              <th class="px-4 py-3 text-left">Source</th>
              <th class="px-4 py-3 text-left">Status</th>
              <th class="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-desco-100">
            ${bookings.map(b => bookingRow(b)).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Attach row actions
  bookings.forEach(b => {
    document.getElementById(`edit-bk-${b.id}`)?.addEventListener('click', () => openBookingForm(b, refresh));
    document.getElementById(`cancel-bk-${b.id}`)?.addEventListener('click', () => cancelBooking(b, refresh));
  });
}

function bookingRow(b) {
  const time = b.time_slot ? b.time_slot.slice(0, 5) : '—';
  const sectionLabel = b.section === 'dining' ? 'Dining' : 'Walk-in';
  const serviceName = b.services?.name || '—';
  const isCancelled = b.status === 'cancelled';

  return `
    <tr class="${isCancelled ? 'opacity-40' : ''} hover:bg-desco-50/50 transition-colors">
      <td class="px-4 py-3 font-medium">${time}</td>
      <td class="px-4 py-3">${b.first_name} ${b.last_name}</td>
      <td class="px-4 py-3">
        <span class="inline-flex items-center gap-1.5">
          <span class="w-1.5 h-1.5 rounded-full ${b.section === 'dining' ? 'bg-desco-900' : 'bg-desco-400'}"></span>
          ${sectionLabel}
        </span>
      </td>
      <td class="px-4 py-3 text-desco-500">${serviceName}</td>
      <td class="px-4 py-3 text-center font-medium">${b.party_size}</td>
      <td class="px-4 py-3">
        <span class="text-[10px] uppercase tracking-wider ${b.source === 'admin' ? 'text-blue-600' : 'text-desco-400'}">${b.source}</span>
      </td>
      <td class="px-4 py-3">
        <span class="inline-flex items-center gap-1.5 text-xs ${isCancelled ? 'text-red-500' : 'text-green-600'}">
          <span class="w-1.5 h-1.5 rounded-full ${isCancelled ? 'bg-red-500' : 'bg-green-500'}"></span>
          ${b.status}
        </span>
      </td>
      <td class="px-4 py-3 text-right">
        <div class="flex items-center justify-end gap-1">
          <button id="edit-bk-${b.id}" class="p-1.5 rounded-lg hover:bg-desco-100 text-desco-400 hover:text-desco-600 transition-all" title="Edit">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
          </button>
          ${!isCancelled ? `
            <button id="cancel-bk-${b.id}" class="p-1.5 rounded-lg hover:bg-red-50 text-desco-400 hover:text-red-500 transition-all" title="Cancel">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          ` : ''}
        </div>
      </td>
    </tr>
  `;
}

// ============================================================
// BOOKING FORM (create / edit)
// ============================================================
async function openBookingForm(booking, onDone) {
  const isEdit = !!booking;
  const b = booking || {};

  // Fetch services for dropdown
  const { data: services } = await supabase
    .from('services')
    .select('id, name')
    .eq('is_active', true)
    .order('sort_order');

  const serviceOptions = (services || [])
    .map(s => `<option value="${s.id}" ${b.service_id === s.id ? 'selected' : ''}>${s.name}</option>`)
    .join('');

  const body = `
    <div class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-medium text-desco-500 uppercase tracking-wider mb-1.5">First Name</label>
          <input id="bk-fname" type="text" value="${b.first_name || ''}"
            class="w-full px-3 py-2.5 bg-white border border-desco-200 rounded-lg text-sm"/>
        </div>
        <div>
          <label class="block text-xs font-medium text-desco-500 uppercase tracking-wider mb-1.5">Last Name</label>
          <input id="bk-lname" type="text" value="${b.last_name || ''}"
            class="w-full px-3 py-2.5 bg-white border border-desco-200 rounded-lg text-sm"/>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-medium text-desco-500 uppercase tracking-wider mb-1.5">Phone</label>
          <input id="bk-phone" type="tel" value="${b.phone_encrypted || ''}" placeholder="+39..."
            class="w-full px-3 py-2.5 bg-white border border-desco-200 rounded-lg text-sm"/>
        </div>
        <div>
          <label class="block text-xs font-medium text-desco-500 uppercase tracking-wider mb-1.5">Email</label>
          <input id="bk-email" type="email" value="${b.email_encrypted || ''}" placeholder="guest@email.com"
            class="w-full px-3 py-2.5 bg-white border border-desco-200 rounded-lg text-sm"/>
        </div>
      </div>

      <div>
        <label class="block text-xs font-medium text-desco-500 uppercase tracking-wider mb-1.5">Date of Birth</label>
        <input id="bk-dob" type="date" value="${b.dob_encrypted || ''}"
          class="w-full px-3 py-2.5 bg-white border border-desco-200 rounded-lg text-sm"/>
      </div>

      <div class="pt-3 border-t border-desco-100 grid grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-medium text-desco-500 uppercase tracking-wider mb-1.5">Service</label>
          <select id="bk-service" class="w-full px-3 py-2.5 bg-white border border-desco-200 rounded-lg text-sm">
            <option value="">Select...</option>
            ${serviceOptions}
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-desco-500 uppercase tracking-wider mb-1.5">Section</label>
          <select id="bk-section" class="w-full px-3 py-2.5 bg-white border border-desco-200 rounded-lg text-sm">
            <option value="dining" ${b.section === 'dining' ? 'selected' : ''}>Dining Table</option>
            <option value="walkin" ${b.section === 'walkin' ? 'selected' : ''}>Walk-in Lounge</option>
          </select>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-4">
        <div>
          <label class="block text-xs font-medium text-desco-500 uppercase tracking-wider mb-1.5">Date</label>
          <input id="bk-date" type="date" value="${b.booking_date || filters.date}"
            class="w-full px-3 py-2.5 bg-white border border-desco-200 rounded-lg text-sm"/>
        </div>
        <div>
          <label class="block text-xs font-medium text-desco-500 uppercase tracking-wider mb-1.5">Time Slot</label>
          <input id="bk-time" type="time" value="${b.time_slot?.slice(0,5) || ''}" step="1800"
            class="w-full px-3 py-2.5 bg-white border border-desco-200 rounded-lg text-sm"/>
        </div>
        <div>
          <label class="block text-xs font-medium text-desco-500 uppercase tracking-wider mb-1.5">Party Size</label>
          <select id="bk-pax" class="w-full px-3 py-2.5 bg-white border border-desco-200 rounded-lg text-sm">
            ${[1,2,3,4,5,6,7,8,9,10].map(n => `<option value="${n}" ${b.party_size === n ? 'selected' : ''}>${n}</option>`).join('')}
          </select>
        </div>
      </div>

      <div>
        <label class="block text-xs font-medium text-desco-500 uppercase tracking-wider mb-1.5">Notes</label>
        <textarea id="bk-notes" rows="2" class="w-full px-3 py-2.5 bg-white border border-desco-200 rounded-lg text-sm resize-none">${b.notes || ''}</textarea>
      </div>
    </div>
  `;

  openModal({
    title: isEdit ? 'Edit Booking' : 'New Booking',
    body,
    saveLabel: isEdit ? 'Save Changes' : 'Create Booking',
    onSave: async () => {
      const fname = document.getElementById('bk-fname').value.trim();
      const lname = document.getElementById('bk-lname').value.trim();
      const phone = document.getElementById('bk-phone').value.trim();
      const email = document.getElementById('bk-email').value.trim();
      const dob = document.getElementById('bk-dob').value;
      const serviceId = document.getElementById('bk-service').value;
      const section = document.getElementById('bk-section').value;
      const date = document.getElementById('bk-date').value;
      const time = document.getElementById('bk-time').value || null;
      const pax = parseInt(document.getElementById('bk-pax').value);
      const notes = document.getElementById('bk-notes').value.trim();

      if (!fname || !lname) { showToast('Name is required', 'error'); throw new Error('validation'); }
      if (!serviceId) { showToast('Select a service', 'error'); throw new Error('validation'); }
      if (!date) { showToast('Date is required', 'error'); throw new Error('validation'); }
      if (section === 'dining' && !time) { showToast('Time slot is required for dining', 'error'); throw new Error('validation'); }

      // Get service for duration
      const { data: svc } = await supabase.from('services').select('booking_duration_minutes').eq('id', serviceId).single();

      // TODO: encrypt phone, email, dob via API route
      // For now store as plaintext (will wire encryption later)
      const payload = {
        first_name: fname,
        last_name: lname,
        phone_encrypted: phone,   // TODO: encrypt
        email_encrypted: email,   // TODO: encrypt
        dob_encrypted: dob,       // TODO: encrypt
        service_id: serviceId,
        section,
        booking_date: date,
        time_slot: time,
        party_size: pax,
        duration_minutes: svc?.booking_duration_minutes || 120,
        notes: notes || null,
        tc_accepted: true,
        source: 'admin',
      };

      let error;
      if (isEdit) {
        // Don't update encrypted fields if they're empty (user didn't re-enter)
        if (!phone) delete payload.phone_encrypted;
        if (!email) delete payload.email_encrypted;
        if (!dob) delete payload.dob_encrypted;
        ({ error } = await supabase.from('bookings').update(payload).eq('id', b.id));
      } else {
        if (!phone || !email || !dob) { showToast('Phone, email, and DOB are required', 'error'); throw new Error('validation'); }
        ({ error } = await supabase.from('bookings').insert(payload));
      }

      if (error) { showToast(error.message, 'error'); throw error; }
      showToast(isEdit ? 'Booking updated' : 'Booking created', 'success');
      onDone();
    }
  });
}

async function cancelBooking(booking, onDone) {
  const confirmed = await confirmDialog(`Cancel booking for ${booking.first_name} ${booking.last_name}?`);
  if (!confirmed) return;

  const { error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', booking.id);

  if (error) { showToast(error.message, 'error'); return; }
  showToast('Booking cancelled', 'success');
  onDone();
}

// ============================================================
// EXPORT
// ============================================================
async function exportBookings() {
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('*, services(name)')
    .eq('booking_date', filters.date)
    .order('time_slot');

  if (error || !bookings?.length) {
    showToast('No bookings to export', 'error');
    return;
  }

  // Build CSV
  const headers = ['Time', 'First Name', 'Last Name', 'Phone', 'Email', 'DOB', 'Section', 'Service', 'Party Size', 'Status', 'Source', 'Notes'];
  const rows = bookings.map(b => [
    b.time_slot?.slice(0, 5) || '',
    b.first_name,
    b.last_name,
    b.phone_encrypted,  // TODO: decrypt
    b.email_encrypted,  // TODO: decrypt
    b.dob_encrypted,    // TODO: decrypt
    b.section,
    b.services?.name || '',
    b.party_size,
    b.status,
    b.source,
    b.notes || '',
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `desco-bookings-${filters.date}.csv`;
  a.click();
  URL.revokeObjectURL(url);

  showToast('Exported to CSV', 'success');
}

// ============================================================
// UTILS
// ============================================================
function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}
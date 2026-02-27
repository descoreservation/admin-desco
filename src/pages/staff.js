// ============================================================
// Staff Page (owner only)
// ============================================================
import { supabase } from '../lib/supabase.js';
import { showToast } from '../lib/toast.js';
import { confirmDialog } from '../lib/modal.js';

export async function render(container, actionsContainer) {
  actionsContainer.innerHTML = '';
  container.innerHTML = `<div class="fade-in"><p class="text-desco-400 text-sm">Loading staff...</p></div>`;

  const { data: admins, error } = await supabase
    .from('admins')
    .select('*')
    .order('created_at');

  if (error) {
    container.innerHTML = `<p class="text-red-500 text-sm">Error: ${error.message}</p>`;
    return;
  }

  const refresh = () => render(container, actionsContainer);

  container.innerHTML = `
    <div class="fade-in space-y-6">
      <!-- Add staff -->
      <div class="bg-white rounded-xl border border-desco-200 px-6 py-5">
        <h3 class="text-sm font-semibold mb-1">Add Staff Member</h3>
        <p class="text-xs text-desco-400 mb-4">Add their email. They can then sign up on the admin site and will be automatically linked.</p>
        <div class="flex gap-3">
          <input 
            id="staff-email" 
            type="email" 
            placeholder="staff@email.com"
            class="flex-1 px-3 py-2.5 bg-white border border-desco-200 rounded-lg text-sm"
          />
          <input 
            id="staff-name" 
            type="text" 
            placeholder="Display name (optional)"
            class="w-48 px-3 py-2.5 bg-white border border-desco-200 rounded-lg text-sm"
          />
          <button id="staff-add-btn" class="px-5 py-2.5 bg-desco-900 text-white text-sm font-medium rounded-lg hover:bg-desco-800 transition-all shrink-0">
            Add
          </button>
        </div>
      </div>

      <!-- Staff list -->
      <div class="bg-white rounded-xl border border-desco-200 overflow-hidden">
        <div class="px-6 py-3 bg-desco-50 border-b border-desco-200 flex items-center text-[10px] font-medium text-desco-400 uppercase tracking-wider">
          <span class="flex-1">Email</span>
          <span class="w-32">Name</span>
          <span class="w-24">Role</span>
          <span class="w-24">Status</span>
          <span class="w-16"></span>
        </div>
        <div class="divide-y divide-desco-100">
          ${admins.map(a => staffRow(a)).join('')}
        </div>
      </div>
    </div>
  `;

  // Add staff
  document.getElementById('staff-add-btn').addEventListener('click', () => addStaff(refresh));
  document.getElementById('staff-email').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addStaff(refresh);
  });

  // Row actions
  admins.forEach(a => {
    document.getElementById(`toggle-staff-${a.id}`)?.addEventListener('click', () => toggleStaff(a, refresh));
    document.getElementById(`remove-staff-${a.id}`)?.addEventListener('click', () => removeStaff(a, refresh));
  });
}

function staffRow(admin) {
  const linked = !!admin.user_id;
  const isOwner = admin.role === 'owner';

  return `
    <div class="px-6 py-3.5 flex items-center ${!admin.is_active ? 'opacity-50' : ''}">
      <span class="flex-1 text-sm">${admin.email}</span>
      <span class="w-32 text-sm text-desco-500">${admin.display_name || '—'}</span>
      <span class="w-24">
        <span class="text-[10px] uppercase tracking-wider font-medium ${isOwner ? 'text-desco-900' : 'text-desco-400'}">${admin.role}</span>
      </span>
      <span class="w-24">
        ${linked 
          ? '<span class="inline-flex items-center gap-1 text-[10px] text-green-600"><span class="w-1.5 h-1.5 rounded-full bg-green-500"></span>Linked</span>'
          : '<span class="inline-flex items-center gap-1 text-[10px] text-desco-400"><span class="w-1.5 h-1.5 rounded-full bg-desco-300"></span>Pending</span>'
        }
      </span>
      <span class="w-16 flex justify-end gap-1">
        ${!isOwner ? `
          <button id="toggle-staff-${admin.id}" class="p-1.5 rounded-lg hover:bg-desco-50 text-desco-400 hover:text-desco-600 transition-all" title="${admin.is_active ? 'Deactivate' : 'Activate'}">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              ${admin.is_active 
                ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>'
                : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>'
              }
            </svg>
          </button>
          <button id="remove-staff-${admin.id}" class="p-1.5 rounded-lg hover:bg-red-50 text-desco-400 hover:text-red-500 transition-all" title="Remove">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        ` : ''}
      </span>
    </div>
  `;
}

async function addStaff(onDone) {
  const email = document.getElementById('staff-email').value.trim().toLowerCase();
  const name = document.getElementById('staff-name').value.trim();

  if (!email) {
    showToast('Email is required', 'error');
    return;
  }

  const { error } = await supabase.from('admins').insert({
    email,
    display_name: name || null,
    role: 'staff',
  });

  if (error) {
    if (error.code === '23505') {
      showToast('This email is already added', 'error');
    } else {
      showToast(error.message, 'error');
    }
    return;
  }

  showToast(`${email} added as staff`, 'success');
  onDone();
}

async function toggleStaff(admin, onDone) {
  const { error } = await supabase
    .from('admins')
    .update({ is_active: !admin.is_active })
    .eq('id', admin.id);

  if (error) { showToast(error.message, 'error'); return; }
  showToast(`${admin.email} ${admin.is_active ? 'deactivated' : 'activated'}`, 'success');
  onDone();
}

async function removeStaff(admin, onDone) {
  const confirmed = await confirmDialog(`Remove ${admin.email} from staff? They will lose admin access immediately.`);
  if (!confirmed) return;

  const { error } = await supabase.from('admins').delete().eq('id', admin.id);
  if (error) { showToast(error.message, 'error'); return; }
  showToast(`${admin.email} removed`, 'success');
  onDone();
}
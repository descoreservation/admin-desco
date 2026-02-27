// ============================================================
// Services Page
// ============================================================
import { supabase } from '../lib/supabase.js';
import { showToast } from '../lib/toast.js';
import { openModal, confirmDialog } from '../lib/modal.js';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_NAMES_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
// Mapping: display index -> DB day_of_week (0=Sun, 1=Mon, ..., 6=Sat)
const DAY_DB_INDEX = [1, 2, 3, 4, 5, 6, 0];

export async function render(container, actionsContainer) {
  actionsContainer.innerHTML = `
    <button id="add-service-btn" class="px-4 py-2 bg-desco-900 text-white text-sm font-medium rounded-lg hover:bg-desco-800 transition-all duration-150 flex items-center gap-2">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
      </svg>
      New Service
    </button>
  `;

  const refresh = () => render(container, actionsContainer);

  document.getElementById('add-service-btn').addEventListener('click', () => {
    openServiceForm(null, {}, refresh);
  });

  container.innerHTML = `<div class="fade-in"><p class="text-desco-400 text-sm">Loading services...</p></div>`;

  const { data: services, error } = await supabase
    .from('services')
    .select('*')
    .order('sort_order');

  if (error) {
    container.innerHTML = `<p class="text-red-500 text-sm">Error: ${error.message}</p>`;
    return;
  }

  if (!services?.length) {
    container.innerHTML = `
      <div class="fade-in bg-white rounded-xl border border-desco-200 p-12 text-center">
        <p class="text-desco-500 text-sm mb-1">No services yet</p>
        <p class="text-desco-400 text-xs">Create your first service to get started.</p>
      </div>
    `;
    return;
  }

  const { data: dayConfigs } = await supabase.from('service_day_config').select('*');
  const configMap = {};
  (dayConfigs || []).forEach(dc => {
    if (!configMap[dc.service_id]) configMap[dc.service_id] = {};
    configMap[dc.service_id][dc.day_of_week] = dc;
  });

  container.innerHTML = `<div class="fade-in space-y-4">${
    services.map(s => serviceCard(s, configMap[s.id] || {})).join('')
  }</div>`;

  services.forEach(s => {
    const configs = configMap[s.id] || {};
    el(`edit-${s.id}`)?.addEventListener('click', () => openServiceForm(s, configs, refresh));
    el(`toggle-${s.id}`)?.addEventListener('click', () => toggleActive(s, refresh));
    el(`delete-${s.id}`)?.addEventListener('click', () => deleteService(s, refresh));
  });
}

function el(id) { return document.getElementById(id); }

// ============================================================
// SERVICE CARD
// ============================================================
function serviceCard(service, dayConfig) {
  const s = service;
  const days = DAY_NAMES.map((name, i) => {
    const dbDay = DAY_DB_INDEX[i];
    const active = dayConfig[dbDay] ? dayConfig[dbDay].active : true;
    return `<span class="inline-flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-medium ${
      active ? 'bg-desco-900 text-white' : 'bg-desco-100 text-desco-300'
    }">${name.charAt(0)}</span>`;
  }).join('');

  const sections = [];
  if (s.dining_enabled) sections.push(`Dining: <strong class="text-desco-700">${s.dining_capacity}</strong>`);
  if (s.walkin_enabled) sections.push(`Walk-in: <strong class="text-desco-700">${s.walkin_capacity}</strong>`);

  return `
    <div class="bg-white rounded-xl border border-desco-200 ${!s.is_active ? 'opacity-50' : ''}">
      <div class="px-6 py-5">
        <div class="flex items-start justify-between mb-4">
          <div>
            <div class="flex items-center gap-2.5">
              <h3 class="text-sm font-semibold">${s.name}</h3>
              ${!s.is_active ? '<span class="text-[10px] uppercase tracking-wider text-desco-400 bg-desco-100 px-2 py-0.5 rounded-full">Inactive</span>' : ''}
            </div>
            <p class="text-xs text-desco-400 mt-1">
              ${s.start_time.slice(0,5)} – ${s.end_time.slice(0,5)}
              <span class="mx-1.5">·</span>
              ${s.booking_duration_minutes}min booking
            </p>
          </div>
          <div class="flex items-center gap-1">
            <button id="edit-${s.id}" class="px-3 py-1.5 rounded-lg border border-desco-200 bg-white hover:bg-desco-50 text-desco-600 text-xs font-medium transition-all flex items-center gap-1.5">
              ${editIcon} Edit
            </button>
            <button id="toggle-${s.id}" class="p-1.5 rounded-lg border border-desco-200 bg-white hover:bg-desco-50 text-desco-500 transition-all" title="${s.is_active ? 'Deactivate' : 'Activate'}">
              ${s.is_active ? eyeOffIcon : eyeIcon}
            </button>
            <button id="delete-${s.id}" class="p-1.5 rounded-lg border border-desco-200 bg-white hover:bg-red-50 text-desco-500 hover:text-red-500 transition-all" title="Delete">
              ${trashIcon}
            </button>
          </div>
        </div>
        <div class="flex gap-5 mb-4 text-xs text-desco-500">
          ${sections.length ? sections.join('<span class="text-desco-200">|</span>') : '<span class="text-desco-300">No sections enabled</span>'}
        </div>
        <div class="flex items-center gap-1.5">${days}</div>
      </div>
    </div>
  `;
}

function iconBtn(id, title, svg, extraClass = '') {
  return `<button id="${id}" class="p-2 rounded-lg hover:bg-desco-50 text-desco-400 hover:text-desco-600 transition-all ${extraClass}" title="${title}">${svg}</button>`;
}

const editIcon = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>`;
const eyeIcon = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>`;
const eyeOffIcon = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M3 3l18 18"/></svg>`;
const trashIcon = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>`;

// ============================================================
// SERVICE FORM — all-in-one: basics + sections + day schedule
// ============================================================
function openServiceForm(service, existingDayConfigs, onDone) {
  const isEdit = !!service;
  const s = service || {};

  // Default values for day config
  const defStart = s.start_time?.slice(0,5) || '12:00';
  const defEnd = s.end_time?.slice(0,5) || '15:00';
  const defDining = s.dining_capacity ?? 70;
  const defWalkin = s.walkin_capacity ?? 40;

  const dayRows = DAY_NAMES_FULL.map((name, i) => {
    const dbDay = DAY_DB_INDEX[i];
    const dc = existingDayConfigs[dbDay] || {};
    const isActive = dc.active !== undefined ? dc.active : true;

    // Show override value if exists, otherwise show inherited default
    const hasStartOverride = !!dc.start_time;
    const hasEndOverride = !!dc.end_time;
    const hasDiningOverride = dc.dining_capacity !== undefined && dc.dining_capacity !== null;
    const hasWalkinOverride = dc.walkin_capacity !== undefined && dc.walkin_capacity !== null;

    const startVal = dc.start_time?.slice(0,5) || defStart;
    const endVal = dc.end_time?.slice(0,5) || defEnd;
    const diningVal = hasDiningOverride ? dc.dining_capacity : defDining;
    const walkinVal = hasWalkinOverride ? dc.walkin_capacity : defWalkin;

    // Inherited values get lighter styling
    const inheritedClass = 'text-desco-400';
    const overrideClass = 'text-desco-900 font-medium';

    return `
      <div class="flex items-center gap-2 py-2 ${i < 6 ? 'border-b border-desco-50' : ''}">
        <label class="relative inline-flex items-center cursor-pointer shrink-0">
          <input type="checkbox" class="sr-only peer dc-active" data-day="${dbDay}" ${isActive ? 'checked' : ''}/>
          <div class="w-8 h-[18px] bg-desco-200 peer-checked:bg-desco-900 rounded-full after:content-[''] after:absolute after:top-[1px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-3.5"></div>
        </label>
        <span class="text-xs font-medium w-20 shrink-0">${name}</span>
        <input type="time"   class="dc-start  px-1.5 py-1 border border-desco-200 rounded text-[11px] w-[78px] ${hasStartOverride ? overrideClass : inheritedClass}" data-day="${dbDay}" data-inherited="${!hasStartOverride}" value="${startVal}"/>
        <input type="time"   class="dc-end    px-1.5 py-1 border border-desco-200 rounded text-[11px] w-[78px] ${hasEndOverride ? overrideClass : inheritedClass}" data-day="${dbDay}" data-inherited="${!hasEndOverride}" value="${endVal}"/>
        <input type="number" class="dc-dining px-1.5 py-1 border border-desco-200 rounded text-[11px] w-[60px] ${hasDiningOverride ? overrideClass : inheritedClass}" data-day="${dbDay}" data-inherited="${!hasDiningOverride}" value="${diningVal}" min="0"/>
        <input type="number" class="dc-walkin px-1.5 py-1 border border-desco-200 rounded text-[11px] w-[60px] ${hasWalkinOverride ? overrideClass : inheritedClass}" data-day="${dbDay}" data-inherited="${!hasWalkinOverride}" value="${walkinVal}" min="0"/>
      </div>
    `;
  }).join('');

  const body = `
    <div class="space-y-4">
      <div>
        <label class="block text-xs font-medium text-desco-500 uppercase tracking-wider mb-1.5">Name</label>
        <input id="svc-name" type="text" value="${s.name || ''}"
          class="w-full px-3 py-2.5 bg-white border border-desco-200 rounded-lg text-sm" placeholder="e.g. Lunch, Dinner"/>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-medium text-desco-500 uppercase tracking-wider mb-1.5">Default Start</label>
          <input id="svc-start" type="time" value="${s.start_time?.slice(0,5) || '12:00'}"
            class="w-full px-3 py-2.5 bg-white border border-desco-200 rounded-lg text-sm"/>
        </div>
        <div>
          <label class="block text-xs font-medium text-desco-500 uppercase tracking-wider mb-1.5">Default End</label>
          <input id="svc-end" type="time" value="${s.end_time?.slice(0,5) || '15:00'}"
            class="w-full px-3 py-2.5 bg-white border border-desco-200 rounded-lg text-sm"/>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-medium text-desco-500 uppercase tracking-wider mb-1.5">Booking Duration (min)</label>
          <input id="svc-duration" type="number" value="${s.booking_duration_minutes || 120}" min="30" step="30"
            class="w-full px-3 py-2.5 bg-white border border-desco-200 rounded-lg text-sm"/>
        </div>
        <div>
          <label class="block text-xs font-medium text-desco-500 uppercase tracking-wider mb-1.5">Slot Interval (min)</label>
          <input id="svc-interval" type="number" value="${s.slot_interval_minutes || 30}" min="15" step="15"
            class="w-full px-3 py-2.5 bg-white border border-desco-200 rounded-lg text-sm"/>
        </div>
      </div>

      <!-- Sections -->
      <div class="pt-3 border-t border-desco-100">
        <div class="flex items-center justify-between mb-3">
          <label class="text-xs font-medium text-desco-500 uppercase tracking-wider">Dining Table</label>
          <label class="relative inline-flex items-center cursor-pointer">
            <input id="svc-dining-on" type="checkbox" ${s.dining_enabled !== false ? 'checked' : ''} class="sr-only peer"/>
            <div class="w-9 h-5 bg-desco-200 peer-checked:bg-desco-900 rounded-full after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
          </label>
        </div>
        <label class="block text-xs text-desco-400 mb-1.5">Default max capacity</label>
        <input id="svc-dining-cap" type="number" value="${s.dining_capacity ?? 70}" min="0"
          class="w-full px-3 py-2.5 bg-white border border-desco-200 rounded-lg text-sm"/>
      </div>

      <div class="pt-3 border-t border-desco-100">
        <div class="flex items-center justify-between mb-3">
          <label class="text-xs font-medium text-desco-500 uppercase tracking-wider">Walk-in Lounge</label>
          <label class="relative inline-flex items-center cursor-pointer">
            <input id="svc-walkin-on" type="checkbox" ${s.walkin_enabled !== false ? 'checked' : ''} class="sr-only peer"/>
            <div class="w-9 h-5 bg-desco-200 peer-checked:bg-desco-900 rounded-full after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
          </label>
        </div>
        <label class="block text-xs text-desco-400 mb-1.5">Default max capacity</label>
        <input id="svc-walkin-cap" type="number" value="${s.walkin_capacity ?? 40}" min="0"
          class="w-full px-3 py-2.5 bg-white border border-desco-200 rounded-lg text-sm"/>
      </div>

      <!-- Weekly schedule -->
      <div class="pt-3 border-t border-desco-100">
        <label class="block text-xs font-medium text-desco-500 uppercase tracking-wider mb-1">Weekly Schedule</label>
        <p class="text-[11px] text-desco-400 mb-3">Toggle days on/off. Override hours and capacity per day — leave empty to use defaults above.</p>
        <div class="bg-desco-50 rounded-lg px-3 py-2">
          <div class="flex items-center gap-2 pb-1.5 mb-1 border-b border-desco-200 text-[9px] font-medium text-desco-400 uppercase tracking-wider">
            <span class="w-8 shrink-0"></span>
            <span class="w-20 shrink-0">Day</span>
            <span class="w-[78px]">Start</span>
            <span class="w-[78px]">End</span>
            <span class="w-[60px]">Dining</span>
            <span class="w-[60px]">Walk-in</span>
          </div>
          ${dayRows}
        </div>
      </div>
    </div>
  `;

  const { modal: modalEl } = openModal({
    title: isEdit ? `Edit — ${s.name}` : 'New Service',
    body,
    saveLabel: isEdit ? 'Save Changes' : 'Create Service',
    wide: true,
    onSave: async () => {
      const payload = {
        name: el('svc-name').value.trim(),
        start_time: el('svc-start').value,
        end_time: el('svc-end').value,
        booking_duration_minutes: int('svc-duration'),
        slot_interval_minutes: int('svc-interval'),
        dining_enabled: el('svc-dining-on').checked,
        dining_capacity: int('svc-dining-cap'),
        walkin_enabled: el('svc-walkin-on').checked,
        walkin_capacity: int('svc-walkin-cap'),
      };

      if (!payload.name) { showToast('Name is required', 'error'); throw new Error('validation'); }

      // Auto sort_order from start time (e.g. "12:00" → 1200, "19:00" → 1900)
      const timeParts = payload.start_time.split(':');
      payload.sort_order = parseInt(timeParts[0]) * 100 + parseInt(timeParts[1] || 0);

      let serviceId;

      if (isEdit) {
        const { error } = await supabase.from('services').update(payload).eq('id', s.id);
        if (error) { showToast(error.message, 'error'); throw error; }
        serviceId = s.id;
      } else {
        const { data, error } = await supabase.from('services').insert(payload).select('id').single();
        if (error) { showToast(error.message, 'error'); throw error; }
        serviceId = data.id;
      }

      // Save day configs — only store overrides (values that differ from service defaults)
      const savedStart = payload.start_time;
      const savedEnd = payload.end_time;
      const savedDining = payload.dining_capacity;
      const savedWalkin = payload.walkin_capacity;

      for (let i = 0; i < 7; i++) {
        const active = document.querySelector(`.dc-active[data-day="${i}"]`).checked;
        const startVal = document.querySelector(`.dc-start[data-day="${i}"]`).value || null;
        const endVal = document.querySelector(`.dc-end[data-day="${i}"]`).value || null;
        const diningVal = document.querySelector(`.dc-dining[data-day="${i}"]`).value;
        const walkinVal = document.querySelector(`.dc-walkin[data-day="${i}"]`).value;

        // Check if this day actually differs from defaults
        const startDiffers = startVal && startVal !== savedStart;
        const endDiffers = endVal && endVal !== savedEnd;
        const diningDiffers = diningVal !== '' && parseInt(diningVal) !== savedDining;
        const walkinDiffers = walkinVal !== '' && parseInt(walkinVal) !== savedWalkin;
        const hasOverride = !active || startDiffers || endDiffers || diningDiffers || walkinDiffers;

        const dcPayload = {
          service_id: serviceId,
          day_of_week: i,
          active,
          start_time: startDiffers ? startVal : null,
          end_time: endDiffers ? endVal : null,
          dining_capacity: diningDiffers ? parseInt(diningVal) : null,
          walkin_capacity: walkinDiffers ? parseInt(walkinVal) : null,
        };

        const existing = existingDayConfigs[i];
        if (existing) {
          if (hasOverride) {
            await supabase.from('service_day_config').update(dcPayload).eq('id', existing.id);
          } else {
            // No override needed — remove the config row
            await supabase.from('service_day_config').delete().eq('id', existing.id);
          }
        } else if (hasOverride) {
          await supabase.from('service_day_config').insert(dcPayload);
        }
      }

      showToast(isEdit ? 'Service updated' : 'Service created', 'success');
      onDone();
    }
  });

  // Live-sync: when default fields change, update inherited day config values
  function syncDefaults() {
    const start = el('svc-start')?.value || '12:00';
    const end = el('svc-end')?.value || '15:00';
    const dining = el('svc-dining-cap')?.value || '0';
    const walkin = el('svc-walkin-cap')?.value || '0';

    document.querySelectorAll('.dc-start[data-inherited="true"]').forEach(input => { input.value = start; });
    document.querySelectorAll('.dc-end[data-inherited="true"]').forEach(input => { input.value = end; });
    document.querySelectorAll('.dc-dining[data-inherited="true"]').forEach(input => { input.value = dining; });
    document.querySelectorAll('.dc-walkin[data-inherited="true"]').forEach(input => { input.value = walkin; });
  }

  ['svc-start', 'svc-end', 'svc-dining-cap', 'svc-walkin-cap'].forEach(id => {
    el(id)?.addEventListener('input', syncDefaults);
  });

  // When user edits a day field, mark it as no longer inherited
  modalEl.querySelectorAll('.dc-start, .dc-end, .dc-dining, .dc-walkin').forEach(input => {
    input.addEventListener('input', () => {
      input.dataset.inherited = 'false';
      input.classList.remove('text-desco-400');
      input.classList.add('text-desco-900', 'font-medium');
    });
  });
}

function int(id) { return parseInt(document.getElementById(id).value) || 0; }

// ============================================================
// ACTIONS
// ============================================================
async function toggleActive(service, onDone) {
  const { error } = await supabase
    .from('services')
    .update({ is_active: !service.is_active })
    .eq('id', service.id);

  if (error) { showToast('Failed to update', 'error'); return; }
  showToast(`${service.name} ${service.is_active ? 'deactivated' : 'activated'}`, 'success');
  onDone();
}

async function deleteService(service, onDone) {
  const confirmed = await confirmDialog(`Delete "${service.name}"? Existing bookings will be preserved but no new bookings can be made.`);
  if (!confirmed) return;

  const { error } = await supabase.from('services').delete().eq('id', service.id);
  if (error) { showToast(`Cannot delete: ${error.message}`, 'error'); return; }
  showToast(`${service.name} deleted`, 'success');
  onDone();
}
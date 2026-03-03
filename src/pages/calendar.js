// ============================================================
// Calendar Page
// ============================================================
import { supabase } from '../lib/supabase.js';
import { showToast } from '../lib/toast.js';
import { openModal } from '../lib/modal.js';

let viewYear, viewMonth; // 0-indexed month

export async function render(container, actionsContainer) {
  const now = new Date();
  viewYear = viewYear || now.getFullYear();
  viewMonth = viewMonth !== undefined ? viewMonth : now.getMonth();

  actionsContainer.innerHTML = '';

  container.innerHTML = `<div class="fade-in" id="cal-root"></div>`;
  await renderMonth(container);
}

async function renderMonth() {
  const root = document.getElementById('cal-root');
  if (!root) return;

  root.innerHTML = `<p class="text-desco-400 text-sm">Loading...</p>`;

  // Fetch services (full data for resolving defaults)
  const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');

  if (!services?.length) {
    root.innerHTML = `
      <div class="bg-white rounded-xl border border-desco-200 p-12 text-center">
        <p class="text-desco-500 text-sm">No active services. Create services first.</p>
      </div>
    `;
    return;
  }

  // Build full service lookup
  const fullServices = {};
  services.forEach(s => { fullServices[s.id] = s; });

  // Get month boundaries
  const firstDay = new Date(viewYear, viewMonth, 1);
  const lastDay = new Date(viewYear, viewMonth + 1, 0);
  const startDate = formatDate(firstDay);
  const endDate = formatDate(lastDay);

  // Fetch day configs for all services
  const { data: dayConfigs } = await supabase
    .from('service_day_config')
    .select('*');

  const dayConfigMap = {};
  (dayConfigs || []).forEach(dc => {
    const key = `${dc.service_id}-${dc.day_of_week}`;
    dayConfigMap[key] = dc;
  });

  // Fetch date overrides for this month
  const { data: overrides } = await supabase
    .from('service_date_overrides')
    .select('*')
    .gte('override_date', startDate)
    .lte('override_date', endDate);

  const overrideMap = {};
  (overrides || []).forEach(o => {
    const key = `${o.service_id}-${o.override_date}`;
    overrideMap[key] = o;
  });

  // Build calendar
  const monthName = firstDay.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const startDow = firstDay.getDay(); // 0=Sun
  const mondayOffset = (startDow + 6) % 7; // Convert to Mon=0, Tue=1, ..., Sun=6
  const daysInMonth = lastDay.getDate();
  const today = formatDate(new Date());

  // Service color assignments
  const colors = ['bg-desco-900', 'bg-blue-500', 'bg-amber-500', 'bg-emerald-500', 'bg-rose-500', 'bg-purple-500'];
  const serviceColors = {};
  services.forEach((s, i) => { serviceColors[s.id] = colors[i % colors.length]; });

  // Generate day cells
  let cells = '';

  // Empty cells before first day
  for (let i = 0; i < mondayOffset; i++) {
    cells += `<div class="h-24 border border-desco-100 bg-desco-50/50 rounded-lg"></div>`;
  }

  // Day cells
  for (let d = 1; d <= daysInMonth; d++) {
    const date = formatDate(new Date(viewYear, viewMonth, d));
    const dow = new Date(viewYear, viewMonth, d).getDay();
    const isToday = date === today;
    const isPast = date < today;

    // Resolve active services for this day
    const dayServices = services.map(s => {
      const overrideKey = `${s.id}-${date}`;
      const override = overrideMap[overrideKey];
      const dayConfig = dayConfigMap[`${s.id}-${dow}`];

      let active;
      let hasOverride = false;
      let note = null;

      if (override) {
        active = override.active;
        hasOverride = true;
        note = override.note;
      } else if (dayConfig) {
        active = dayConfig.active;
      } else {
        active = true;
      }

      return { ...s, active, hasOverride, note, color: serviceColors[s.id] };
    });

    const allClosed = dayServices.every(s => !s.active);

    cells += `
      <div class="h-24 border border-desco-100 rounded-lg p-2 cursor-pointer transition-all hover:border-desco-300 hover:shadow-sm ${
        isToday ? 'ring-2 ring-desco-900 ring-offset-1' : ''
      } ${isPast ? 'opacity-40' : ''} ${allClosed ? 'bg-red-50/50' : 'bg-white'}"
        data-date="${date}">
        <div class="flex items-center justify-between mb-1.5">
          <span class="text-xs font-medium ${isToday ? 'text-desco-900' : 'text-desco-600'}">${d}</span>
          ${dayServices.some(s => s.hasOverride) ? '<span class="w-1.5 h-1.5 rounded-full bg-amber-400" title="Has override"></span>' : ''}
        </div>
        <div class="flex flex-col gap-1">
          ${dayServices.map(s => `
            <div class="flex items-center gap-1.5" title="${s.name}${s.note ? ': ' + s.note : ''}">
              <span class="w-2 h-2 rounded-full shrink-0 ${s.active ? s.color : 'bg-desco-200'}"></span>
              <span class="text-[10px] truncate ${s.active ? 'text-desco-600' : 'text-desco-300 line-through'}">${s.name}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // Legend
  const legend = services.map(s => `
    <div class="flex items-center gap-1.5">
      <span class="w-2.5 h-2.5 rounded-full ${serviceColors[s.id]}"></span>
      <span class="text-xs text-desco-600">${s.name}</span>
    </div>
  `).join('');

  root.innerHTML = `
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-4">
        <button id="cal-prev" class="p-2 rounded-lg hover:bg-white border border-desco-200 text-desco-500 hover:text-desco-700 transition-all">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <h3 class="text-lg font-semibold">${monthName}</h3>
        <button id="cal-next" class="p-2 rounded-lg hover:bg-white border border-desco-200 text-desco-500 hover:text-desco-700 transition-all">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
          </svg>
        </button>
        <button id="cal-today" class="text-xs text-desco-400 hover:text-desco-600 transition-colors ml-2">Today</button>
      </div>
      <div class="flex items-center gap-4">${legend}</div>
    </div>

    <!-- Day headers -->
    <div class="grid grid-cols-7 gap-1.5 mb-1.5">
      ${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d =>
        `<div class="text-center text-[10px] font-medium text-desco-400 uppercase tracking-wider py-1">${d}</div>`
      ).join('')}
    </div>

    <!-- Calendar grid -->
    <div class="grid grid-cols-7 gap-1.5">
      ${cells}
    </div>
  `;

  // Nav listeners
  document.getElementById('cal-prev').addEventListener('click', () => {
    viewMonth--;
    if (viewMonth < 0) { viewMonth = 11; viewYear--; }
    renderMonth();
  });

  document.getElementById('cal-next').addEventListener('click', () => {
    viewMonth++;
    if (viewMonth > 11) { viewMonth = 0; viewYear++; }
    renderMonth();
  });

  document.getElementById('cal-today').addEventListener('click', () => {
    const now = new Date();
    viewYear = now.getFullYear();
    viewMonth = now.getMonth();
    renderMonth();
  });

  // Day click listeners
  root.querySelectorAll('[data-date]').forEach(cell => {
    cell.addEventListener('click', () => {
      const date = cell.dataset.date;
      openDayOverride(date, services, serviceColors, dayConfigMap, overrideMap, fullServices);
    });
  });
}

// ============================================================
// DAY OVERRIDE PANEL
// ============================================================
function openDayOverride(date, services, serviceColors, dayConfigMap, overrideMap, fullServices) {
  const dow = new Date(date + 'T00:00:00').getDay();
  const dateLabel = new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const rows = services.map(s => {
    const override = overrideMap[`${s.id}-${date}`];
    const dayConfig = dayConfigMap[`${s.id}-${dow}`];
    const full = fullServices[s.id] || {};

    // Resolve current effective values (override > day config > service default)
    const active = override ? override.active : (dayConfig ? dayConfig.active : true);
    const note = override?.note || '';

    const resolvedStart = override?.start_time?.slice(0, 5) || dayConfig?.start_time?.slice(0, 5) || full.start_time?.slice(0, 5) || '';
    const resolvedEnd = override?.end_time?.slice(0, 5) || dayConfig?.end_time?.slice(0, 5) || full.end_time?.slice(0, 5) || '';
    const resolvedDining = override?.dining_capacity ?? dayConfig?.dining_capacity ?? full.dining_capacity ?? '';
    const resolvedWalkin = override?.walkin_capacity ?? dayConfig?.walkin_capacity ?? full.walkin_capacity ?? '';

    const hasOverride = !!override;

    return `
      <div class="py-3 ${services.indexOf(s) < services.length - 1 ? 'border-b border-desco-50' : ''}">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full ${serviceColors[s.id]}"></span>
            <span class="text-sm font-medium">${s.name}</span>
            ${hasOverride ? '<span class="text-[9px] uppercase tracking-wider text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Override</span>' : ''}
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" class="sr-only peer ov-active" data-service="${s.id}" ${active ? 'checked' : ''}/>
            <div class="w-9 h-5 bg-desco-200 peer-checked:bg-desco-900 rounded-full after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
          </label>
        </div>
        <div class="grid grid-cols-4 gap-2">
          <input type="time"   class="ov-start  px-2 py-1.5 border border-desco-200 rounded text-xs" data-service="${s.id}" value="${resolvedStart}"/>
          <input type="time"   class="ov-end    px-2 py-1.5 border border-desco-200 rounded text-xs" data-service="${s.id}" value="${resolvedEnd}"/>
          <input type="number" class="ov-dining px-2 py-1.5 border border-desco-200 rounded text-xs" data-service="${s.id}" value="${resolvedDining}" min="0"/>
          <input type="number" class="ov-walkin px-2 py-1.5 border border-desco-200 rounded text-xs" data-service="${s.id}" value="${resolvedWalkin}" min="0"/>
        </div>
        <div class="grid grid-cols-4 gap-2 mt-1 text-[9px] text-desco-400 uppercase tracking-wider">
          <span>Start</span><span>End</span><span>Dining</span><span>Drink lounge</span>
        </div>
        <input type="text" class="ov-note mt-2 w-full px-2 py-1.5 border border-desco-200 rounded text-xs" data-service="${s.id}" value="${note}" placeholder="Note (e.g. Christmas, Private event)"/>
      </div>
    `;
  }).join('');

  const body = `
    <div>
      <div class="flex items-center justify-between mb-4">
        <div>
          <p class="text-xs text-desco-400">Configure services for this specific date. Leave fields empty to use weekly defaults.</p>
        </div>
        <button class="close-all-btn text-xs text-red-500 hover:text-red-700 font-medium transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50">
          Close all
        </button>
      </div>
      ${rows}
    </div>
  `;

  const { modal } = openModal({
    title: dateLabel,
    body,
    saveLabel: 'Save Overrides',
    wide: false,
    onSave: async () => {
      const dow = new Date(date + 'T00:00:00').getDay();
      for (const s of services) {
        const active = modal.querySelector(`.ov-active[data-service="${s.id}"]`).checked;
        const startVal = modal.querySelector(`.ov-start[data-service="${s.id}"]`).value || null;
        const endVal = modal.querySelector(`.ov-end[data-service="${s.id}"]`).value || null;
        const diningVal = modal.querySelector(`.ov-dining[data-service="${s.id}"]`).value;
        const walkinVal = modal.querySelector(`.ov-walkin[data-service="${s.id}"]`).value;
        const note = modal.querySelector(`.ov-note[data-service="${s.id}"]`).value.trim();

        const existing = overrideMap[`${s.id}-${date}`];
        const dayConfig = dayConfigMap[`${s.id}-${dow}`];
        const full = fullServices[s.id] || {};

        // Resolve what the default would be (without any date override)
        const defaultActive = dayConfig ? dayConfig.active : true;
        const defaultStart = (dayConfig?.start_time?.slice(0, 5) || full.start_time?.slice(0, 5) || '');
        const defaultEnd = (dayConfig?.end_time?.slice(0, 5) || full.end_time?.slice(0, 5) || '');
        const defaultDining = String(dayConfig?.dining_capacity ?? full.dining_capacity ?? '');
        const defaultWalkin = String(dayConfig?.walkin_capacity ?? full.walkin_capacity ?? '');

        // Check if anything differs from defaults
        const isDifferent = 
          active !== defaultActive ||
          (startVal || '') !== defaultStart ||
          (endVal || '') !== defaultEnd ||
          diningVal !== defaultDining ||
          walkinVal !== defaultWalkin ||
          note !== '';

        if (existing) {
          if (isDifferent) {
            await supabase.from('service_date_overrides').update({
              active,
              start_time: startVal,
              end_time: endVal,
              dining_capacity: diningVal !== '' ? parseInt(diningVal) : null,
              walkin_capacity: walkinVal !== '' ? parseInt(walkinVal) : null,
              note: note || null,
            }).eq('id', existing.id);
          } else {
            // Back to defaults — remove override
            await supabase.from('service_date_overrides').delete().eq('id', existing.id);
          }
        } else if (isDifferent) {
          await supabase.from('service_date_overrides').insert({
            service_id: s.id,
            override_date: date,
            active,
            start_time: startVal,
            end_time: endVal,
            dining_capacity: diningVal !== '' ? parseInt(diningVal) : null,
            walkin_capacity: walkinVal !== '' ? parseInt(walkinVal) : null,
            note: note || null,
          });
        }
      }

      showToast('Overrides saved', 'success');
      renderMonth();
    }
  });

  // Close all button
  modal.querySelector('.close-all-btn').addEventListener('click', () => {
    modal.querySelectorAll('.ov-active').forEach(cb => { cb.checked = false; });
  });
}

// ============================================================
// UTILS
// ============================================================
function formatDate(d) {
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

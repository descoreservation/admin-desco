// ============================================================
// Settings Page
// ============================================================
import { supabase } from '../lib/supabase.js';
import { showToast } from '../lib/toast.js';

const FIELDS = [
  { key: 'whatsapp_number', label: 'WhatsApp Number', placeholder: '+39 000 000 0000', type: 'tel' },
  { key: 'whatsapp_message', label: 'WhatsApp Pre-filled Message', placeholder: 'Ciao, vorrei gestire la mia prenotazione...', type: 'text' },
  { key: 'instagram_url', label: 'Instagram URL', placeholder: 'https://instagram.com/...', type: 'url' },
  { key: 'facebook_url', label: 'Facebook URL', placeholder: 'https://facebook.com/...', type: 'url' },
  { key: 'tiktok_url', label: 'TikTok URL', placeholder: 'https://tiktok.com/@...', type: 'url' },
  { key: 'website_url', label: 'Website URL', placeholder: 'https://...', type: 'url' },
  { key: 'terms_conditions_url', label: 'Terms & Conditions URL', placeholder: 'https://...', type: 'url' },
  { key: 'contact_email', label: 'Contact Email', placeholder: 'info@desco.com', type: 'email' },
  { key: 'contact_phone', label: 'Contact Phone', placeholder: '+39 000 000 0000', type: 'tel' },
  { key: 'address', label: 'Address', placeholder: 'Via Roma 1, Milano', type: 'text' },
  { key: 'opening_hours', label: 'Opening Hours', placeholder: 'Mon–Sat 12:00–02:00', type: 'text' },
];

export async function render(container, actionsContainer) {
  actionsContainer.innerHTML = '';
  container.innerHTML = `<div class="fade-in"><p class="text-desco-400 text-sm">Loading settings...</p></div>`;

  const { data, error } = await supabase
    .from('site_settings')
    .select('*')
    .eq('id', 1)
    .single();

  if (error) {
    container.innerHTML = `<p class="text-red-500 text-sm">Error: ${error.message}</p>`;
    return;
  }

  const settings = data || {};

  container.innerHTML = `
    <div class="fade-in">
      <div class="bg-white rounded-xl border border-desco-200 overflow-hidden">
        <div class="divide-y divide-desco-100">
          ${FIELDS.map(f => fieldRow(f, settings[f.key] || '')).join('')}
        </div>
        <div class="px-6 py-4 bg-desco-50 border-t border-desco-200 flex justify-end">
          <button id="settings-save" class="px-5 py-2 bg-desco-900 text-white text-sm font-medium rounded-lg hover:bg-desco-800 transition-all">
            Save Settings
          </button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('settings-save').addEventListener('click', save);
}

function fieldRow(field, value) {
  return `
    <div class="px-6 py-4 flex items-center gap-6">
      <label class="text-xs font-medium text-desco-500 uppercase tracking-wider w-48 shrink-0">${field.label}</label>
      <input 
        id="set-${field.key}" 
        type="${field.type}" 
        value="${escapeHtml(value)}"
        placeholder="${field.placeholder}"
        class="flex-1 px-3 py-2 bg-white border border-desco-200 rounded-lg text-sm transition-all duration-150"
      />
    </div>
  `;
}

async function save() {
  const btn = document.getElementById('settings-save');
  btn.disabled = true;
  btn.textContent = 'Saving...';

  const payload = {};
  FIELDS.forEach(f => {
    payload[f.key] = document.getElementById(`set-${f.key}`).value.trim();
  });

  const { error } = await supabase
    .from('site_settings')
    .update(payload)
    .eq('id', 1);

  btn.disabled = false;
  btn.textContent = 'Save Settings';

  if (error) {
    showToast(`Error: ${error.message}`, 'error');
    return;
  }

  showToast('Settings saved', 'success');
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
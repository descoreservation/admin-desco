// ============================================================
// Modal Utility
// ============================================================

/**
 * Opens a modal with the given title and body HTML.
 * Returns { modal, close, onSave } where onSave accepts a callback.
 *
 * Usage:
 *   const { modal, close } = openModal({
 *     title: 'Edit Service',
 *     body: '<div>...</div>',
 *     saveLabel: 'Save Changes',
 *     onSave: async () => { ... }
 *   });
 */
export function openModal({ title, body, saveLabel = 'Save', onSave, wide = false }) {
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-50 flex items-center justify-center';

  overlay.innerHTML = `
    <div class="absolute inset-0 bg-black/30 backdrop-blur-sm modal-backdrop"></div>
    <div class="relative bg-white rounded-2xl shadow-2xl w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} mx-4 fade-in overflow-hidden">
      <div class="px-6 py-5 border-b border-desco-100">
        <h3 class="text-base font-semibold">${title}</h3>
      </div>
      <div class="px-6 py-5 max-h-[70vh] overflow-y-auto modal-body">
        ${body}
      </div>
      <div class="px-6 py-4 border-t border-desco-100 flex justify-end gap-3">
        <button class="modal-cancel px-4 py-2 text-sm text-desco-500 hover:text-desco-700 transition-colors">Cancel</button>
        <button class="modal-save px-5 py-2 bg-desco-900 text-white text-sm font-medium rounded-lg hover:bg-desco-800 transition-all">
          ${saveLabel}
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => overlay.remove();

  // Close on backdrop click or cancel
  overlay.querySelector('.modal-backdrop').addEventListener('click', close);
  overlay.querySelector('.modal-cancel').addEventListener('click', close);

  // Escape key
  const escHandler = (e) => {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escHandler); }
  };
  document.addEventListener('keydown', escHandler);

  // Save button
  const saveBtn = overlay.querySelector('.modal-save');
  if (onSave) {
    saveBtn.addEventListener('click', async () => {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';
      try {
        await onSave();
        close();
      } catch (err) {
        saveBtn.disabled = false;
        saveBtn.textContent = saveLabel;
        throw err;
      }
    });
  }

  return { modal: overlay, close, saveBtn };
}

/**
 * Simple confirm dialog.
 * Returns a promise that resolves to true/false.
 */
export function confirmDialog(message) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-50 flex items-center justify-center';

    overlay.innerHTML = `
      <div class="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
      <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 fade-in overflow-hidden">
        <div class="px-6 py-6">
          <p class="text-sm text-desco-700">${message}</p>
        </div>
        <div class="px-6 py-4 border-t border-desco-100 flex justify-end gap-3">
          <button class="confirm-no px-4 py-2 text-sm text-desco-500 hover:text-desco-700 transition-colors">Cancel</button>
          <button class="confirm-yes px-5 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-all">Confirm</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('.confirm-no').addEventListener('click', () => {
      overlay.remove();
      resolve(false);
    });

    overlay.querySelector('.confirm-yes').addEventListener('click', () => {
      overlay.remove();
      resolve(true);
    });
  });
}
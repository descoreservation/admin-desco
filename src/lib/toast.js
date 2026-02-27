// ============================================================
// Toast Notifications
// ============================================================

const COLORS = {
  success: 'bg-desco-900 text-white',
  error: 'bg-red-600 text-white',
  info: 'bg-white text-desco-900 border border-desco-200',
};

export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');

  toast.className = `${COLORS[type] || COLORS.info} px-4 py-3 rounded-lg shadow-lg text-sm fade-in max-w-sm`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
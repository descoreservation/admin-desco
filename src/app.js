// ============================================================
// DESCO Admin — App Shell
// ============================================================
import { login, signup, logout, checkSession, getUser, getAdmin } from './lib/auth.js';
import { showToast } from './lib/toast.js';
import * as servicesPage from './pages/services.js';
import * as settingsPage from './pages/settings.js';
import * as staffPage from './pages/staff.js';
import * as bookingsPage from './pages/bookings.js';
import * as calendarPage from './pages/calendar.js';

// --- DOM ---
const loginScreen = document.getElementById('login-screen');
const appShell = document.getElementById('app-shell');
const pageTitle = document.getElementById('page-title');
const pageContent = document.getElementById('page-content');
const pageActions = document.getElementById('page-actions');

let currentPage = 'services';

// ============================================================
// AUTH UI
// ============================================================
document.getElementById('login-btn').addEventListener('click', async () => {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errorEl = document.getElementById('login-error');
  const btn = document.getElementById('login-btn');

  if (!email || !password) {
    errorEl.textContent = 'Please fill in all fields.';
    errorEl.classList.remove('hidden');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Signing in...';
  errorEl.classList.add('hidden');

  try {
    await login(email, password);
    showApp();
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign in';
  }
});

document.getElementById('signup-btn').addEventListener('click', async () => {
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const errorEl = document.getElementById('signup-error');
  const successEl = document.getElementById('signup-success');
  const btn = document.getElementById('signup-btn');

  errorEl.classList.add('hidden');
  successEl.classList.add('hidden');

  if (!email || !password) {
    errorEl.textContent = 'Please fill in all fields.';
    errorEl.classList.remove('hidden');
    return;
  }
  if (password.length < 8) {
    errorEl.textContent = 'Password must be at least 8 characters.';
    errorEl.classList.remove('hidden');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Creating account...';

  try {
    await signup(email, password);
    successEl.textContent = 'Account created. You can now sign in. Your email must be pre-authorized by an admin.';
    successEl.classList.remove('hidden');
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Create account';
  }
});

document.getElementById('toggle-signup-btn').addEventListener('click', () => {
  document.getElementById('signup-section').classList.toggle('hidden');
});

// Enter key
['login-email', 'login-password'].forEach(id => {
  document.getElementById(id).addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('login-btn').click();
  });
});

// Logout
document.getElementById('logout-btn').addEventListener('click', async () => {
  await logout();
  appShell.classList.add('hidden');
  loginScreen.classList.remove('hidden');
  document.getElementById('login-email').value = '';
  document.getElementById('login-password').value = '';
  document.getElementById('login-error').classList.add('hidden');
});

// ============================================================
// APP SHELL
// ============================================================
function showApp() {
  loginScreen.classList.add('hidden');
  appShell.classList.remove('hidden');

  const user = getUser();
  const admin = getAdmin();

  document.getElementById('user-email').textContent = user.email;
  document.getElementById('user-role').textContent = admin.role;

  if (admin.role === 'owner') {
    document.getElementById('staff-nav').classList.remove('hidden');
  }

  navigateTo('bookings');
}

// ============================================================
// NAVIGATION
// ============================================================
const PAGE_TITLES = {
  bookings: 'Bookings',
  services: 'Services',
  calendar: 'Calendar',
  settings: 'Site Settings',
  staff: 'Staff Management',
};

// Page modules — add more as we build them
const PAGE_MODULES = {
  bookings: bookingsPage,
  services: servicesPage,
  calendar: calendarPage,
  settings: settingsPage,
  staff: staffPage,
};

function navigateTo(page) {
  currentPage = page;

  // Sidebar active state
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });

  pageTitle.textContent = PAGE_TITLES[page] || page;
  pageActions.innerHTML = '';

  const mod = PAGE_MODULES[page];
  if (mod) {
    mod.render(pageContent, pageActions);
  } else {
    pageContent.innerHTML = `
      <div class="fade-in bg-white rounded-xl border border-desco-200 p-12 text-center">
        <p class="text-desco-500 text-sm">Coming soon</p>
      </div>
    `;
  }
}

// Sidebar clicks
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    if (item.dataset.page) navigateTo(item.dataset.page);
  });
});

// ============================================================
// INIT
// ============================================================
async function init() {
  const session = await checkSession();
  if (session) {
    showApp();
  } else {
    loginScreen.classList.remove('hidden');
  }
}

init();
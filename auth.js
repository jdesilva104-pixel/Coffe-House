const authModal = document.createElement('div');
authModal.className = 'auth-modal';
authModal.hidden = true;
authModal.setAttribute('role', 'dialog');
authModal.setAttribute('aria-modal', 'true');
authModal.setAttribute('aria-labelledby', 'auth-title');
authModal.innerHTML = `
  <section class="auth-card">
    <button class="auth-close" type="button" aria-label="Close">&times;</button>
    <div class="auth-tabs" role="tablist" aria-label="Account access">
      <button type="button" role="tab" data-auth-tab="signin" aria-selected="true">Sign in</button>
      <button type="button" role="tab" data-auth-tab="signup" aria-selected="false">Sign up</button>
    </div>
    <h2 id="auth-title">Sign in</h2>
    <p class="auth-message" role="status" aria-live="polite"></p>
    <form class="auth-form">
      <label class="auth-name" hidden>Full name<input name="name" autocomplete="name" maxlength="100"></label>
      <label>Email address<input name="email" type="email" autocomplete="email" required maxlength="254"></label>
      <label>Password<input name="password" type="password" autocomplete="current-password" required minlength="8" maxlength="128"></label>
      <button class="order-primary" type="submit">Sign in</button>
    </form>
  </section>`;
document.body.append(authModal);

const authForm = authModal.querySelector('.auth-form');
const authMessage = authModal.querySelector('.auth-message');
const authTitle = authModal.querySelector('#auth-title');
const nameLabel = authModal.querySelector('.auth-name');
const passwordInput = authForm.elements.password;
let authMode = 'signin';
let lastAuthTrigger = null;

function setAuthMode(mode) {
  authMode = mode;
  const signup = mode === 'signup';
  authTitle.textContent = signup ? 'Create your account' : 'Sign in';
  nameLabel.hidden = !signup;
  nameLabel.querySelector('input').required = signup;
  passwordInput.autocomplete = signup ? 'new-password' : 'current-password';
  passwordInput.minLength = signup ? 8 : 0;
  authForm.querySelector('[type="submit"]').textContent = signup ? 'Create account' : 'Sign in';
  authModal.querySelectorAll('[data-auth-tab]').forEach((tab) => {
    tab.setAttribute('aria-selected', String(tab.dataset.authTab === mode));
  });
  authMessage.textContent = '';
}

function closeAuthModal() {
  authModal.hidden = true;
  if (lastAuthTrigger) lastAuthTrigger.focus();
}

function getAuthClient() {
  const { url, anonKey } = window.SUPABASE_CONFIG || {};
  let validHttps = false;
  try {
    const parsed = new URL(url);
    validHttps = parsed.protocol === 'https:' || parsed.hostname === 'localhost';
  } catch { /* Missing or invalid project URL. */ }

  if (!validHttps || !anonKey || !window.supabase?.createClient) return null;
  return window.supabase.createClient(url, anonKey);
}

const supabaseClient = getAuthClient();
const signInButton = document.querySelector('[data-auth-open="signin"]');
const signUpButton = document.querySelector('[data-auth-open="signup"]');
const accountUser = document.querySelector('.account-user');
const signOutButton = document.querySelector('[data-auth-signout]');

function updateAccount(user) {
  signInButton.hidden = Boolean(user);
  signUpButton.hidden = Boolean(user);
  accountUser.hidden = !user;
  signOutButton.hidden = !user;
  accountUser.textContent = user?.email || '';
}

document.addEventListener('click', (event) => {
  const openButton = event.target.closest('[data-auth-open]');
  if (openButton) {
    lastAuthTrigger = openButton;
    setAuthMode(openButton.dataset.authOpen);
    authModal.hidden = false;
    if (!supabaseClient) {
      authMessage.textContent = 'Account service setup is incomplete. Add the Supabase project URL and publishable key to supabase-config.js.';
    }
    authForm.querySelector(openButton.dataset.authOpen === 'signup' ? '[name="name"]' : '[name="email"]').focus();
    return;
  }

  const tab = event.target.closest('[data-auth-tab]');
  if (tab) setAuthMode(tab.dataset.authTab);
  if (event.target === authModal || event.target.closest('.auth-close')) closeAuthModal();
});

authModal.addEventListener('submit', async (event) => {
  if (event.target !== authForm) return;
  event.preventDefault();
  if (!authForm.reportValidity()) return;
  if (!supabaseClient) {
    authMessage.textContent = 'Account service setup is incomplete. Add the Supabase project URL and publishable key to supabase-config.js.';
    return;
  }

  const submitButton = authForm.querySelector('[type="submit"]');
  const formData = new FormData(authForm);
  const email = formData.get('email').trim();
  const password = formData.get('password');
  submitButton.disabled = true;
  authMessage.textContent = authMode === 'signup' ? 'Creating your account…' : 'Signing in…';

  try {
    const result = authMode === 'signup'
      ? await supabaseClient.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: formData.get('name').trim() },
            emailRedirectTo: window.location.origin
          }
        })
      : await supabaseClient.auth.signInWithPassword({ email, password });

    if (result.error) throw result.error;
    if (authMode === 'signup' && !result.data.session) {
      authMessage.textContent = 'Account created. Check your email to confirm your address, then sign in.';
      authForm.reset();
      return;
    }

    updateAccount(result.data.user);
    authMessage.textContent = authMode === 'signup' ? 'Your account is ready.' : 'You are signed in.';
    window.setTimeout(closeAuthModal, 900);
  } catch (error) {
    authMessage.textContent = error.message || 'Could not complete the request. Please try again.';
  } finally {
    submitButton.disabled = false;
  }
});

signOutButton.addEventListener('click', async () => {
  if (!supabaseClient) return;
  const { error } = await supabaseClient.auth.signOut();
  if (error) {
    accountUser.textContent = error.message;
    return;
  }
  updateAccount(null);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !authModal.hidden) closeAuthModal();
});

if (supabaseClient) {
  supabaseClient.auth.getSession().then(({ data }) => updateAccount(data.session?.user ?? null));
  supabaseClient.auth.onAuthStateChange((_event, session) => updateAccount(session?.user ?? null));
}

export function initAuth(onLoginSuccess) {
  const seg = document.getElementById('seg');
  const tabs = seg.querySelectorAll('[role="tab"]');
  const panels = document.querySelectorAll('.panel');
  const track = document.getElementById('track');
  const togglePassBtns = document.querySelectorAll('[data-toggle-password]');
  const loginErrorMsg = document.getElementById('auth-error');
  const regErrorMsg = document.getElementById('reg-error');

  function syncHeight() {
    const active = document.querySelector('.panel.is-active');
    if (active && track) {
      track.style.height = active.offsetHeight + 'px';
    }
  }

  function setMode(mode) {
    seg.dataset.mode = mode;
    tabs.forEach(t => {
      const on = t.dataset.mode === mode;
      t.setAttribute('aria-selected', String(on));
    });
    panels.forEach(p => {
      p.classList.toggle('is-active', p.dataset.panel === mode);
    });
    syncHeight();
  }

  tabs.forEach(t => t.addEventListener('click', () => setMode(t.dataset.mode)));
  window.addEventListener('resize', syncHeight);
  setTimeout(syncHeight, 100);

  togglePassBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.togglePassword);
      if (input) {
        const isPass = input.type === 'password';
        input.type = isPass ? 'text' : 'password';
        btn.setAttribute('aria-pressed', String(isPass));
      }
    });
  });

  const loginForm = document.getElementById('form-login');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (loginErrorMsg) loginErrorMsg.textContent = '';
      const btn = document.getElementById('btn-login');
      if (btn) btn.classList.add('is-loading');

      try {
        const username = document.getElementById('login-user').value.trim();
        const password = document.getElementById('login-password').value;
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Ошибка входа');
        onLoginSuccess(data.user);
      } catch (err) {
        if (loginErrorMsg) loginErrorMsg.textContent = err.message;
      } finally {
        if (btn) btn.classList.remove('is-loading');
      }
    });
  }

  const registerForm = document.getElementById('form-register');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (regErrorMsg) regErrorMsg.textContent = '';
      const btn = document.getElementById('btn-register');
      if (btn) btn.classList.add('is-loading');

      try {
        const username = document.getElementById('reg-user').value.trim();
        const password = document.getElementById('reg-password').value;
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Ошибка регистрации');
        onLoginSuccess(data.user);
      } catch (err) {
        if (regErrorMsg) regErrorMsg.textContent = err.message;
      } finally {
        if (btn) btn.classList.remove('is-loading');
      }
    });
  }
}

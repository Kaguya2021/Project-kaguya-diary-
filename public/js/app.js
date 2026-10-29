import { initAuth } from './auth.js';
import { loadSchedule } from './schedule.js';
import { initHomework } from './homework.js';
import { openReader, initReader } from './reader.js';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const res = await fetch('/api/auth/me');
    if (res.ok) {
      const data = await res.json();
      enterMainApp(data.user);
    } else {
      initAuth((user) => enterMainApp(user));
    }
  } catch (err) {
    initAuth((user) => enterMainApp(user));
  }

  initReader();
  initBackgroundEffects();
});

function initBackgroundEffects() {
  const cvs = document.getElementById('stars');
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  let w = 0, h = 0, stars = [];

  function resize() {
    w = window.innerWidth;
    h = window.innerHeight;
    cvs.width = w;
    cvs.height = h;
    stars = Array.from({ length: 80 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.5 + 0.5,
      vx: (Math.random() - 0.5) * 0.1,
      vy: (Math.random() - 0.5) * 0.1
    }));
  }

  function loop() {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    stars.forEach(s => {
      s.x += s.vx;
      s.y += s.vy;
      if (s.x < 0) s.x = w;
      if (s.x > w) s.x = 0;
      if (s.y < 0) s.y = h;
      if (s.y > h) s.y = 0;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
    requestAnimationFrame(loop);
  }

  window.addEventListener('resize', resize);
  resize();
  loop();
}

function enterMainApp(user) {
  document.getElementById('auth-screen').classList.remove('active');
  document.getElementById('main-screen').classList.add('active');
  document.getElementById('welcome-username').textContent = user.username;
  document.getElementById('banner-name').textContent = user.username;

  const menuToggle = document.getElementById('menu-toggle');
  const menuClose = document.getElementById('menu-close');
  const sideMenu = document.getElementById('side-menu');
  const menuOverlay = document.getElementById('menu-overlay');

  function toggleMenu() {
    sideMenu.classList.toggle('open');
    menuOverlay.classList.toggle('active');
  }

  menuToggle.addEventListener('click', toggleMenu);
  menuClose.addEventListener('click', toggleMenu);
  menuOverlay.addEventListener('click', toggleMenu);

  document.querySelectorAll('.menu-list li[data-section]').forEach(li => {
    li.addEventListener('click', () => {
      document.querySelectorAll('.menu-list li').forEach(l => l.classList.remove('active'));
      document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));

      li.classList.add('active');
      const sectionId = `section-${li.dataset.section}`;
      document.getElementById(sectionId).classList.add('active');
      toggleMenu();

      if (li.dataset.section === 'schedule') {
        loadSchedule();
      } else if (li.dataset.section === 'homework-add') {
        initHomework();
      } else if (li.dataset.section === 'stats') {
        loadStats();
      }
    });
  });

  document.getElementById('logout-btn').addEventListener('click', async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.reload();
  });

  loadBooks();
}

async function loadBooks() {
  const grid = document.getElementById('books-grid');
  if (!grid) return;

  try {
    const res = await fetch('/api/books');
    const data = await res.json();
    const books = data.books;

    grid.innerHTML = '';
    if (books.length === 0) {
      for (let i = 1; i <= 15; i++) {
        const card = document.createElement('div');
        card.className = 'book-card';
        card.innerHTML = `
          <img src="./photo/${i}.png" class="book-cover" alt="Книга ${i}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'160\' height=\'200\'><rect width=\'100%\' height=\'100%\' fill=\'%2316162c\'/><text x=\'50%\' y=\'50%\' dominant-baseline=\'middle\' text-anchor=\'middle\' fill=\'%23a3a8cc\' font-size=\'14\'>Книга ${i}</text></svg>'">
          <div class="book-info">
            <div class="book-title">Учебник №${i}</div>
            <button class="btn-primary py-2 text-sm open-book-btn" data-id="${i}" data-title="Учебник №${i}">Открыть</button>
          </div>
        `;
        grid.appendChild(card);
      }
    } else {
      books.forEach((book, index) => {
        const card = document.createElement('div');
        card.className = 'book-card';
        const coverNum = (index % 15) + 1;
        card.innerHTML = `
          <img src="./photo/${coverNum}.png" class="book-cover" alt="${book.title}" onerror="this.src='https://via.placeholder.com/160x200?text=Book'">
          <div class="book-info">
            <div class="book-title">${book.title}</div>
            <button class="btn-primary py-2 text-sm open-book-btn" data-id="${book.id}" data-title="${book.title}" data-url="${book.pdf_storage_key}">Открыть</button>
          </div>
        `;
        grid.appendChild(card);
      });
    }

    document.querySelectorAll('.open-book-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const title = btn.dataset.title;
        const url = btn.dataset.url || `https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-prio-pdf.spec`;
        openReader(id, title, url);
      });
    });

    const searchInput = document.getElementById('book-search');
    searchInput.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase();
      document.querySelectorAll('.book-card').forEach(card => {
        const title = card.querySelector('.book-title').textContent.toLowerCase();
        card.style.display = title.includes(term) ? 'flex' : 'none';
      });
    });

  } catch (err) {
    console.error('Failed to load books:', err);
  }
}

async function loadStats() {
  const container = document.getElementById('stats-container');
  if (!container) return;
  try {
    const res = await fetch('/api/homework');
    const data = await res.json();
    const hw = data.homework;
    const total = hw.length;
    const completed = hw.filter(h => h.is_completed).length;
    const active = total - completed;

    container.innerHTML = `
      <div class="glass p-6 rounded-2xl border border-border"><h3 class="text-muted text-sm mb-2">Всего ДЗ</h3><p class="text-3xl font-bold text-fg">${total}</p></div>
      <div class="glass p-6 rounded-2xl border border-border"><h3 class="text-muted text-sm mb-2">Выполнено</h3><p class="text-3xl font-bold text-emerald-400">${completed}</p></div>
      <div class="glass p-6 rounded-2xl border border-border"><h3 class="text-muted text-sm mb-2">Осталось</h3><p class="text-3xl font-bold text-rose-400">${active}</p></div>
    `;
  } catch (err) {
    console.error('Stats load error:', err);
  }
}

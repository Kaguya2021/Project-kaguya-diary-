let scheduleData = {};

export async function initHomework() {
  try {
    const res = await fetch('/api/schedule');
    const data = await res.json();
    scheduleData = data.schedule;

    const weekdaySelect = document.getElementById('hw-weekday');
    const subjectSelect = document.getElementById('hw-subject');

    function updateSubjects() {
      const selectedDay = weekdaySelect.value;
      const subjects = scheduleData[selectedDay] || [];
      subjectSelect.innerHTML = '';
      subjects.forEach(sub => {
        const opt = document.createElement('option');
        opt.value = sub;
        opt.textContent = sub;
        subjectSelect.appendChild(opt);
      });
    }

    weekdaySelect.addEventListener('change', updateSubjects);
    updateSubjects();

    const form = document.getElementById('hw-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const weekday = weekdaySelect.value;
      const subject = subjectSelect.value;
      const description = document.getElementById('hw-desc').value;
      const due_date = document.getElementById('hw-date').value;
      const subjectsList = scheduleData[weekday] || [];
      const lesson_number = subjectsList.indexOf(subject) + 1;

      const res = await fetch('/api/homework', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekday, lesson_number, subject, description, due_date })
      });

      if (res.ok) {
        alert('Домашнее задание успешно сохранено :)');
        form.reset();
        updateSubjects();
        loadHomeworkList('all');
      } else {
        const err = await res.json();
        alert(err.error || 'Ошибка сохранения :)');
      }
    });

    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        loadHomeworkList(e.target.dataset.filter);
      });
    });

    loadHomeworkList('all');
  } catch (err) {
    console.error('Homework init error:', err);
  }
}

async function loadHomeworkList(filter) {
  const listContainer = document.getElementById('hw-list');
  if (!listContainer) return;

  try {
    const res = await fetch('/api/homework');
    const data = await res.json();
    let homeworks = data.homework;

    if (filter === 'active') {
      homeworks = homeworks.filter(h => !h.is_completed);
    } else if (filter === 'completed') {
      homeworks = homeworks.filter(h => h.is_completed);
    }

    listContainer.innerHTML = '';
    if (homeworks.length === 0) {
      listContainer.innerHTML = '<p class="text-muted">Нет домашних заданий :)</p>';
      return;
    }

    homeworks.forEach(hw => {
      const card = document.createElement('div');
      card.className = 'glass p-5 rounded-2xl border border-border flex justify-between items-center';
      card.innerHTML = `
        <div>
          <h4 class="font-bold text-cyan-400 text-lg mb-1">${hw.subject} <span class="text-xs text-muted font-normal">(${hw.weekday}, урок ${hw.lesson_number})</span></h4>
          <p class="text-fg mb-2">${hw.description}</p>
          <div class="text-xs text-faint">Срок: ${new Date(hw.due_date).toLocaleDateString()} | Статус: <span class="${hw.is_completed ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}">${hw.is_completed ? 'Выполнено ✅' : 'Не выполнено ❌'}</span></div>
        </div>
        <div class="flex items-center gap-3">
          <button class="px-4 py-2 rounded-xl bg-violet-600/30 border border-violet-500/40 text-violet-300 font-medium text-sm toggle-hw hover:bg-violet-600/50 transition" data-id="${hw.id}">${hw.is_completed ? 'Отменить' : 'Готово'}</button>
          <button class="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 grid place-content-center delete-hw hover:bg-rose-500/40 transition" data-id="${hw.id}">🗑</button>
        </div>
      `;
      listContainer.appendChild(card);
    });

    listContainer.querySelectorAll('.toggle-hw').forEach(btn => {
      btn.addEventListener('click', async () => {
        await fetch(`/api/homework/${btn.dataset.id}/toggle`, { method: 'PATCH' });
        loadHomeworkList(filter);
      });
    });

    listContainer.querySelectorAll('.delete-hw').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (confirm('Удалить это задание?')) {
          await fetch(`/api/homework/${btn.dataset.id}`, { method: 'DELETE' });
          loadHomeworkList(filter);
        }
      });
    });
  } catch (err) {
    console.error('Failed to load homework list:', err);
  }
}

export async function loadSchedule() {
  const container = document.getElementById('schedule-container');
  if (!container) return;

  try {
    const res = await fetch('/api/schedule');
    const data = await res.json();
    const schedule = data.schedule;

    container.innerHTML = '';
    for (const [day, lessons] of Object.entries(schedule)) {
      const card = document.createElement('div');
      card.className = 'glass p-6 rounded-2xl border border-border';
      
      let html = `<h3 class="text-xl font-bold text-cyan-400 mb-4">${day}</h3><ul class="space-y-2">`;
      lessons.forEach((lesson, index) => {
        html += `<li class="flex items-center gap-3 py-1.5 border-b border-border/50"><span class="w-6 h-6 rounded-full bg-violet-600/30 text-violet-300 grid place-content-center text-xs font-bold">${index + 1}</span><span>${lesson}</span></li>`;
      });
      html += '</ul>';

      card.innerHTML = html;
      container.appendChild(card);
    }
  } catch (err) {
    console.error('Failed to load schedule:', err);
  }
}

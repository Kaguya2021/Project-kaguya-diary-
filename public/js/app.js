let currentTab = 'login';
let currentUser = null;
let books = [];
let currentBookPdf = null;
let currentPage = 1;
let pageCount = 1;

const scheduleMapping = {
    'Понедельник': ['К-тил', 'Технол', 'Хим', 'Дин тарых', 'Алгебр', 'К-адаб'],
    'Вторник': ['Ч-тил', 'Д-тарбия', 'Биолог', 'Тарых', 'Геомет', 'Алгебра'],
    'Среда': ['Геогр', 'Физика', 'К-адаб', 'Инф-ка', 'А.ж.к', 'О-адаб'],
    'Четверг': ['Физика', 'Биолог', 'К-адаб', 'О-адаб', 'Геогр', 'Тарых'],
    'Пятница': ['Алгебра', 'Д-тарбия', 'К-тил', 'Ч-тил', 'О-тил', 'Хим']
};

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
});

async function checkAuth() {
    try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.isAuthenticated) {
            currentUser = data.user;
            document.getElementById('current-username').textContent = currentUser.username;
            document.getElementById('welcome-msg').textContent = `Добро пожаловать, ${currentUser.username}! :)`;
            document.getElementById('auth-container').classList.add('hidden');
            document.getElementById('app-container').classList.remove('hidden');
            loadBooks();
            loadSchedule();
            loadHomework();
            loadStats();
        } else {
            document.getElementById('auth-container').classList.remove('hidden');
            document.getElementById('app-container').classList.add('hidden');
        }
    } catch (err) {
        console.error('Auth check error:', err);
    }
}

function switchTab(tab) {
    currentTab = tab;
    const btnLogin = document.getElementById('tab-login');
    const btnRegister = document.getElementById('tab-register');
    const submitBtn = document.getElementById('auth-submit-btn');

    if (tab === 'login') {
        btnLogin.classList.add('active');
        btnRegister.classList.remove('active');
        submitBtn.textContent = 'Войти';
    } else {
        btnRegister.classList.add('active');
        btnLogin.classList.remove('active');
        submitBtn.textContent = 'Зарегистрироваться';
    }
}

function togglePasswordVisibility() {
    const pwdInput = document.getElementById('password');
    pwdInput.type = pwdInput.type === 'password' ? 'text' : 'password';
}

async function handleAuth(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('auth-error');
    errorDiv.textContent = '';

    const endpoint = currentTab === 'login' ? '/api/auth/login' : '/api/auth/register';

    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();

        if (res.ok) {
            checkAuth();
        } else {
            errorDiv.textContent = data.error || 'Произошла ошибка :)';
        }
    } catch (err) {
        errorDiv.textContent = 'Ошибка соединения с сервером :)';
    }
}

async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    currentUser = null;
    checkAuth();
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

function switchSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(el => el.classList.remove('active'));
    document.getElementById(`section-${sectionId}`).classList.add('active');
    document.getElementById('sidebar').classList.remove('open');
}

async function loadBooks() {
    try {
        const res = await fetch('/api/books');
        books = await res.json();
        renderBooks(books);
    } catch (err) {
        console.error('Error loading books:', err);
    }
}

function renderBooks(booksList) {
    const grid = document.getElementById('books-grid');
    grid.innerHTML = '';
    if (booksList.length === 0) {
        grid.innerHTML = '<p>Книги не найдены :)</p>';
        return;
    }

    booksList.forEach(book => {
        const card = document.createElement('div');
        card.className = 'book-card';
        card.innerHTML = `
            <div class="book-info">
                <div>
                    <h4>${book.title}</h4>
                    <p>${book.description || 'Нет описания'}</p>
                </div>
                <button class="btn primary" onclick="openBook(${book.id}, '${book.pdf_storage_key}', '${book.title}')">Открыть книгу</button>
            </div>
        `;
        grid.appendChild(card);
    });
}

function filterBooks() {
    const query = document.getElementById('book-search').value.toLowerCase();
    const filtered = books.filter(b => b.title.toLowerCase().includes(query) || (b.description && b.description.toLowerCase().includes(query)));
    renderBooks(filtered);
}

async function openBook(bookId, pdfUrl, title) {
    document.getElementById('reader-book-title').textContent = title;
    switchSection('reader');

    try {
        const res = await fetch(`/api/progress/${bookId}`);
        const prog = await res.json();
        currentPage = prog.last_page || 1;
    } catch (err) {
        currentPage = 1;
    }

    try {
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        currentBookPdf = await loadingTask.promise;
        pageCount = currentBookPdf.numPages;
        document.getElementById('page-count').textContent = pageCount;
        renderPage(currentPage, bookId);
    } catch (err) {
        console.error('Error loading PDF:', err);
        alert('Не удалось загрузить PDF файл книги :)');
    }
}

async function renderPage(num, bookId) {
    document.getElementById('page-num').textContent = num;
    const page = await currentBookPdf.getPage(num);
    const canvas = document.getElementById('pdf-canvas');
    const context = canvas.getContext('2d');
    const viewport = page.getViewport({ scale: 1.5 });

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: context, viewport: viewport }).promise;

    if (bookId) {
        fetch(`/api/progress/${bookId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ last_page: num, zoom_level: 1.5 })
        });
    }
}

function changePage(delta) {
    if (!currentBookPdf) return;
    let newPage = currentPage + delta;
    if (newPage < 1) newPage = 1;
    if (newPage > pageCount) newPage = pageCount;
    currentPage = newPage;
    renderPage(currentPage);
}

async function loadSchedule() {
    try {
        const res = await fetch('/api/schedule');
        const data = await res.json();
        const container = document.getElementById('schedule-container');
        container.innerHTML = '';

        for (const [day, lessons] of Object.entries(data)) {
            const card = document.createElement('div');
            card.className = 'schedule-day-card';
            let listHtml = '<ol>';
            lessons.forEach(l => {
                listHtml += `<li>${l}</li>`;
            });
            listHtml += '</ol>';
            card.innerHTML = `<h3>${day}</h3>${listHtml}`;
            container.appendChild(card);
        }
    } catch (err) {
        console.error('Error loading schedule:', err);
    }
}

function updateSubjects() {
    const weekday = document.getElementById('hw-weekday').value;
    const select = document.getElementById('hw-subject-select');
    select.innerHTML = '';

    if (!weekday || !scheduleMapping[weekday]) {
        select.innerHTML = '<option value="">Сначала выберите день недели...</option>';
        return;
    }

    scheduleMapping[weekday].forEach((subject, index) => {
        const opt = document.createElement('option');
        opt.value = subject;
        opt.textContent = `${index + 1} урок: ${subject}`;
        select.appendChild(opt);
    });
}

async function submitHomework(event) {
    event.preventDefault();
    const weekday = document.getElementById('hw-weekday').value;
    const selectIndex = document.getElementById('hw-subject-select').selectedIndex + 1;
    const subject = document.getElementById('hw-subject-select').value;
    const description = document.getElementById('hw-description').value;
    const due_date = document.getElementById('hw-duedate').value;
    const errorDiv = document.getElementById('hw-error');
    errorDiv.textContent = '';

    try {
        const res = await fetch('/api/homework', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                weekday,
                lesson_number: selectIndex,
                subject,
                description,
                due_date: due_date || null
            })
        });
        const data = await res.json();
        if (res.ok) {
            alert('Домашнее задание успешно сохранено! :)');
            document.getElementById('hw-form').reset();
            switchSection('homework-view');
            loadHomework();
            loadStats();
        } else {
            errorDiv.textContent = data.error || 'Ошибка сохранения :)';
        }
    } catch (err) {
        errorDiv.textContent = 'Ошибка соединения :)';
    }
}

async function loadHomework(statusFilter = 'all') {
    try {
        let url = '/api/homework';
        if (statusFilter !== 'all') {
            url += `?status=${statusFilter}`;
        }
        const res = await fetch(url);
        const list = await res.json();
        const container = document.getElementById('homework-list');
        container.innerHTML = '';

        if (list.length === 0) {
            container.innerHTML = '<p>Домашних заданий нет :)</p>';
            return;
        }

        list.forEach(hw => {
            const card = document.createElement('div');
            card.className = `homework-card ${hw.is_completed ? 'completed' : ''}`;
            card.innerHTML = `
                <div>
                    <h4>${hw.subject} (${hw.weekday} - урок №${hw.lesson_number})</h4>
                    <p>${hw.description}</p>
                    <small>Статус: ${hw.is_completed ? 'Выполнено' : 'Не выполнено'} ${hw.due_date ? '| Срок: ' + new Date(hw.due_date).toLocaleDateString() : ''}</small>
                </div>
                <div class="hw-actions">
                    <button class="btn secondary" onclick="toggleHwStatus(${hw.id}, ${!hw.is_completed})">${hw.is_completed ? 'Вернуть' : 'Выполнено'}</button>
                    <button class="btn secondary" style="color:var(--error-color)" onclick="deleteHomework(${hw.id})">Удалить</button>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (err) {
        console.error('Error loading homework:', err);
    }
}

filterHw = function(status) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    loadHomework(status);
};

async function toggleHwStatus(id, newStatus) {
    await fetch(`/api/homework/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_completed: newStatus })
    });
    loadHomework();
    loadStats();
}

async function deleteHomework(id) {
    if (!confirm('Удалить это домашнее задание?')) return;
    await fetch(`/api/homework/${id}`, { method: 'DELETE' });
    loadHomework();
    loadStats();
}

async function loadStats() {
    try {
        const res = await fetch('/api/admin/stats');
        const data = await res.json();
        document.getElementById('stat-books').textContent = data.availableBooks;
        document.getElementById('stat-hw-total').textContent = data.totalHomework;
        document.getElementById('stat-hw-completed').textContent = data.completedHomework;
    } catch (err) {
        console.error('Error loading stats:', err);
    }
}

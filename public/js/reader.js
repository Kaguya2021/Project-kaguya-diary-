let pdfDoc = null;
let pageNum = 1;
let pageRendering = false;
let pageNumPending = null;
let scale = 1.2;
let currentBookId = null;

export async function openReader(bookId, title, pdfUrl) {
  currentBookId = bookId;
  document.getElementById('reader-title').textContent = title;
  document.getElementById('reader-modal').classList.add('active');

  try {
    const res = await fetch(`/api/progress/${bookId}`);
    const data = await res.json();
    pageNum = data.last_page || 1;
    scale = parseFloat(data.zoom_level) || 1.2;
  } catch (err) {
    pageNum = 1;
  }

  pdfjsLib.getDocument(pdfUrl).promise.then((pdfDoc_) => {
    pdfDoc = pdfDoc_;
    document.getElementById('page-count').textContent = pdfDoc.numPages;
    renderPage(pageNum);
  });
}

function renderPage(num) {
  pageRendering = true;
  pdfDoc.getPage(num).then((page) => {
    const canvas = document.getElementById('pdf-canvas');
    const ctx = canvas.getContext('2d');
    const viewport = page.getViewport({ scale });
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext = {
      canvasContext: ctx,
      viewport: viewport
    };
    const renderTask = page.render(renderContext);

    renderTask.promise.then(() => {
      pageRendering = false;
      if (pageNumPending !== null) {
        renderPage(pageNumPending);
        pageNumPending = null;
      }
    });
  });

  document.getElementById('page-num').textContent = num;
  saveProgress(num);
}

function saveProgress(num) {
  if (!currentBookId) return;
  fetch(`/api/progress/${currentBookId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ last_page: num, zoom_level: scale })
  }).catch(err => console.error('Failed to save progress:', err));
}

export function initReader() {
  document.getElementById('reader-back').addEventListener('click', () => {
    document.getElementById('reader-modal').classList.remove('active');
  });

  document.getElementById('zoom-in').addEventListener('click', () => {
    scale += 0.2;
    renderPage(pageNum);
  });

  document.getElementById('zoom-out').addEventListener('click', () => {
    if (scale > 0.6) {
      scale -= 0.2;
      renderPage(pageNum);
    }
  });
}

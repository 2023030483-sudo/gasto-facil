function isStandaloneMode() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function updateViewportVariables() {
  const root = document.documentElement;
  const viewport = window.visualViewport;
  const visibleHeight = Math.max(1, Math.round(viewport?.height || window.innerHeight || root.clientHeight || 1));
  const visibleTop = Math.max(0, Math.round(viewport?.offsetTop || 0));
  const layoutHeight = Math.max(root.clientHeight || 0, window.innerHeight || 0, visibleHeight);

  let bottomOffset = Math.max(0, Math.round(layoutHeight - visibleTop - visibleHeight));

  // En algunas PWA de Android/Samsung, el viewport reportado incluye parte de
  // la barra del sistema. Se calcula una protección adicional para que el menú
  // inferior no quede escondido debajo de esa barra.
  const isAndroid = /Android/i.test(navigator.userAgent || '');
  const screenHeight = Math.max(0, Math.round(window.screen?.height || 0));
  const keyboardLikelyOpen = screenHeight > 0 && visibleHeight < screenHeight * 0.66;

  if (isAndroid && isStandaloneMode() && !keyboardLikelyOpen && screenHeight > visibleHeight) {
    const inferredSystemArea = Math.min(72, Math.max(0, screenHeight - visibleHeight - visibleTop));
    bottomOffset = Math.max(bottomOffset, inferredSystemArea);
  }

  root.style.setProperty('--app-visible-height', `${visibleHeight}px`);
  root.style.setProperty('--viewport-bottom-offset', `${bottomOffset}px`);
}

let viewportUpdateFrame = 0;
function scheduleViewportUpdate() {
  cancelAnimationFrame(viewportUpdateFrame);
  viewportUpdateFrame = requestAnimationFrame(updateViewportVariables);
}

// Se ejecuta al importar common.js, por lo que protege todas las pantallas.
updateViewportVariables();
window.addEventListener('resize', scheduleViewportUpdate, { passive: true });
window.addEventListener('orientationchange', scheduleViewportUpdate, { passive: true });
window.addEventListener('pageshow', scheduleViewportUpdate, { passive: true });
window.visualViewport?.addEventListener('resize', scheduleViewportUpdate, { passive: true });
window.visualViewport?.addEventListener('scroll', scheduleViewportUpdate, { passive: true });

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') scheduleViewportUpdate();
});

export function formatCurrency(value, decimals = 2) {
  const amount = Number(value) || 0;
  return amount.toLocaleString('es-MX', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function formatDate(value) {
  if (!value) return '';
  const date = new Date(value.replace(' ', 'T'));
  return date.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' });
}

export function setActiveNav(page) {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('nav-link--active', link.dataset.page === page);
  });
  scheduleViewportUpdate();
}

export function getTicketData() {
  try {
    return JSON.parse(sessionStorage.getItem('ticketData') || 'null');
  } catch {
    return null;
  }
}

export function setTicketData(data) {
  sessionStorage.setItem('ticketData', JSON.stringify(data));
}

export function clearTicketData() {
  sessionStorage.removeItem('ticketData');
}

export function safeText(value) {
  return String(value || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
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

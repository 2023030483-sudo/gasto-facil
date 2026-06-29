import { supabase } from './supabase.js';
import { refreshBudgetAlerts } from './presupuesto-utils.js';

let revisionEnCurso = false;

/**
 * Revisa el presupuesto sin intervenir con el código principal de Inicio,
 * Gastos, Nuevo gasto o Resumen. El límite se conserva entre meses, pero
 * el gasto, el seguimiento y los avisos se calculan solo para el mes actual.
 */
async function revisarPresupuesto() {
  if (revisionEnCurso) return;
  revisionEnCurso = true;

  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;

    const userId = data?.session?.user?.id;
    if (!userId) return;

    await refreshBudgetAlerts(supabase, userId, { notifyDevice: true, date: new Date() });
  } catch (error) {
    console.warn('No se pudieron revisar los avisos del presupuesto:', error?.message || error);
  } finally {
    revisionEnCurso = false;
  }
}

window.addEventListener('DOMContentLoaded', revisarPresupuesto);
window.addEventListener('pageshow', revisarPresupuesto);

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') void revisarPresupuesto();
});

// También detecta un cambio de mes si la PWA permanece abierta varios días.
window.setInterval(() => {
  if (document.visibilityState === 'visible') void revisarPresupuesto();
}, 60 * 1000);

import { supabase } from './supabase.js';
import { refreshBudgetAlerts } from './presupuesto-utils.js';

/**
 * Revisa el presupuesto sin intervenir con el código principal de Inicio,
 * Gastos, Nuevo gasto o Resumen. Si este archivo faltara, las demás funciones
 * de la aplicación seguirían funcionando normalmente.
 */
async function revisarPresupuesto() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;

    const userId = data?.session?.user?.id;
    if (!userId) return;

    await refreshBudgetAlerts(supabase, userId, { notifyDevice: true });
  } catch (error) {
    console.warn('No se pudieron revisar los avisos del presupuesto:', error?.message || error);
  }
}

window.addEventListener('DOMContentLoaded', revisarPresupuesto);
window.addEventListener('pageshow', event => {
  if (event.persisted) revisarPresupuesto();
});

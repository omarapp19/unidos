/* ===========================================================================
   Agregaciones · lógica pura para dashboard (§3.A), gráfico público (§1.C) y
   reporte (§3.C). Toma donaciones + items + categorías y deriva métricas.
   No depende del backend; opera sobre arreglos en memoria.
   ========================================================================== */

import type { Category, Donation, DonationItem } from '@/types';

/** ¿La fecha ISO cae en el mismo día calendario que `ref` (local)? */
export function isSameDay(iso: string, ref: Date): boolean {
  const d = new Date(iso);
  return (
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
  );
}

/* --- Métricas del dashboard de un centro ------------------------------ */

export interface CenterMetrics {
  donorsToday: number;
  identifiedToday: number;
  anonymousToday: number;
  totalDonationsToday: number;
}

/** Métricas del día para un centro (donantes hoy, identificados vs anónimos). */
export function centerMetricsForDay(
  donations: Donation[],
  centerId: string,
  ref: Date,
): CenterMetrics {
  const today = donations.filter(
    (d) => d.center_id === centerId && isSameDay(d.created_at, ref),
  );
  const anonymous = today.filter((d) => d.is_anonymous).length;
  return {
    donorsToday: today.length,
    identifiedToday: today.length - anonymous,
    anonymousToday: anonymous,
    totalDonationsToday: today.length,
  };
}

/** Total de productos (suma de cantidades) recibidos por un centro. */
export function totalQuantityForCenter(
  donations: Donation[],
  items: DonationItem[],
  centerId: string,
): number {
  const ids = new Set(
    donations.filter((d) => d.center_id === centerId).map((d) => d.id),
  );
  return items
    .filter((it) => ids.has(it.donation_id))
    .reduce((sum, it) => sum + it.quantity, 0);
}

/* --- Acumulado por categoría ------------------------------------------ */

export interface CategoryTotal {
  category: Category;
  /** Suma de cantidades (privado: cantidad exacta del centro). */
  quantity: number;
  /** Porcentaje sobre el total de todas las categorías (0–100). */
  percentage: number;
}

/** Ids de donaciones que pertenecen a un centro. */
function donationIdsForCenter(donations: Donation[], centerId: string): Set<string> {
  return new Set(
    donations.filter((d) => d.center_id === centerId).map((d) => d.id),
  );
}

/**
 * Acumulado de cantidades por categoría.
 * - `centerId` definido → solo ese centro (vista privada: cantidades exactas).
 * - `centerId` undefined → toda la red (vista pública: usar solo el %).
 * Devuelve ordenado de mayor a menor cantidad; incluye categorías en 0.
 */
export function categoryTotals(
  donations: Donation[],
  items: DonationItem[],
  categories: Category[],
  centerId?: string,
): CategoryTotal[] {
  const allowed =
    centerId !== undefined ? donationIdsForCenter(donations, centerId) : null;

  const byCat = new Map<string, number>();
  for (const it of items) {
    if (allowed && !allowed.has(it.donation_id)) continue;
    byCat.set(it.category_id, (byCat.get(it.category_id) ?? 0) + it.quantity);
  }

  const grandTotal = [...byCat.values()].reduce((a, b) => a + b, 0);

  return categories
    .map((category) => {
      const quantity = byCat.get(category.id) ?? 0;
      const percentage = grandTotal === 0 ? 0 : (quantity / grandTotal) * 100;
      return { category, quantity, percentage };
    })
    .sort((a, b) => b.quantity - a.quantity);
}

/* --- Producto más donado ---------------------------------------------- */

/** Categoría con mayor cantidad acumulada en un centro (o null si no hay). */
export function topCategory(
  donations: Donation[],
  items: DonationItem[],
  categories: Category[],
  centerId: string,
): CategoryTotal | null {
  const totals = categoryTotals(donations, items, categories, centerId);
  const top = totals[0];
  return top && top.quantity > 0 ? top : null;
}

/* --- Detalle de una donación (para historial / reporte) --------------- */

export interface DonationDetail {
  donation: Donation;
  items: Array<{ item: DonationItem; categoryName: string }>;
}

/** Une cada donación de un centro con sus items + nombre de categoría. */
export function donationDetails(
  donations: Donation[],
  items: DonationItem[],
  categories: Category[],
  centerId: string,
): DonationDetail[] {
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  return donations
    .filter((d) => d.center_id === centerId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((donation) => ({
      donation,
      items: items
        .filter((it) => it.donation_id === donation.id)
        .map((item) => ({
          item,
          categoryName: catName.get(item.category_id) ?? 'Sin categoría',
        })),
    }));
}

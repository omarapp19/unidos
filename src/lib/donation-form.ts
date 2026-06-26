/* ===========================================================================
   Lógica del formulario de recepción (PRD §3.B) · pura, sin backend.
   - Filas dinámicas: crear / actualizar / quitar.
   - Validación: nombre opcional (vacío ⇒ anónimo), al menos una fila válida,
     cada fila con categoría + producto + cantidad entera > 0.
   - Construcción del payload Donation + DonationItem[] listo para persistir.
   ========================================================================== */

import type { DonationRowValue } from '@/components/domain';

/** Fila vacía nueva. */
export function emptyRow(): DonationRowValue {
  return { categoryId: '', product: '', quantity: '' };
}

/** Estado inicial del formulario: una fila obligatoria. */
export function initialRows(): DonationRowValue[] {
  return [emptyRow()];
}

/* --- Operaciones sobre el arreglo de filas (inmutables) --------------- */

export function addRow(rows: DonationRowValue[]): DonationRowValue[] {
  return [...rows, emptyRow()];
}

export function updateRow(
  rows: DonationRowValue[],
  index: number,
  value: DonationRowValue,
): DonationRowValue[] {
  return rows.map((r, i) => (i === index ? value : r));
}

/** Quita una fila; nunca deja el formulario sin filas (mínimo 1). */
export function removeRow(rows: DonationRowValue[], index: number): DonationRowValue[] {
  if (rows.length <= 1) return rows;
  return rows.filter((_, i) => i !== index);
}

/* --- Validación -------------------------------------------------------- */

/** Error por fila (solo las claves con problema). */
export interface RowErrors {
  categoryId?: string;
  product?: string;
  quantity?: string;
}

export interface DonationFormErrors {
  /** Error a nivel formulario (p. ej. ninguna fila válida). */
  form?: string;
  /** Errores por índice de fila. */
  rows: Record<number, RowErrors>;
}

/** Cantidad válida: entero > 0. */
export function isValidQuantity(raw: string): boolean {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0;
}

/** ¿La fila tiene los tres campos con valor válido? */
export function isRowComplete(row: DonationRowValue): boolean {
  return (
    row.categoryId.trim() !== '' &&
    row.product.trim() !== '' &&
    isValidQuantity(row.quantity)
  );
}

/** ¿La fila está totalmente vacía? (se ignora en la validación). */
function isRowEmpty(row: DonationRowValue): boolean {
  return (
    row.categoryId.trim() === '' &&
    row.product.trim() === '' &&
    row.quantity.trim() === ''
  );
}

/**
 * Valida el formulario completo. El nombre es opcional (no se valida).
 * Reglas: debe haber ≥1 fila completa; las filas no vacías deben estar
 * completas; las filas totalmente vacías se ignoran (salvo que sean las únicas).
 */
export function validateDonationForm(rows: DonationRowValue[]): DonationFormErrors {
  const rowErrors: Record<number, RowErrors> = {};
  let completeCount = 0;

  rows.forEach((row, i) => {
    if (isRowEmpty(row)) return; // fila vacía: se ignora
    if (isRowComplete(row)) {
      completeCount += 1;
      return;
    }
    // Fila parcial: marcar los campos faltantes/ inválidos.
    const e: RowErrors = {};
    if (row.categoryId.trim() === '') e.categoryId = 'Elige una categoría';
    if (row.product.trim() === '') e.product = 'Indica el producto';
    if (!isValidQuantity(row.quantity)) e.quantity = 'Cantidad inválida';
    rowErrors[i] = e;
  });

  const errors: DonationFormErrors = { rows: rowErrors };
  if (completeCount === 0) {
    errors.form = 'Agrega al menos un producto con categoría, descripción y cantidad.';
  }
  return errors;
}

/** ¿El resultado de validar está limpio? */
export function isFormValid(errors: DonationFormErrors): boolean {
  return !errors.form && Object.keys(errors.rows).length === 0;
}

/* Formateo de fechas/horas en es-VE para historial y reportes. */

const TIME_FMT = new Intl.DateTimeFormat('es-VE', {
  hour: '2-digit',
  minute: '2-digit',
});

const DATE_FMT = new Intl.DateTimeFormat('es-VE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const DATETIME_FMT = new Intl.DateTimeFormat('es-VE', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

export const formatTime = (iso: string): string => TIME_FMT.format(new Date(iso));
export const formatDate = (iso: string): string => DATE_FMT.format(new Date(iso));
export const formatDateTime = (iso: string): string =>
  DATETIME_FMT.format(new Date(iso));

/** Fecha larga para encabezado de reporte (ej. "25 de junio de 2026"). */
export function formatLongDate(d: Date): string {
  return new Intl.DateTimeFormat('es-VE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

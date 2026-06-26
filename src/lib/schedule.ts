/* ===========================================================================
   Horario de recepción estructurado. La BD guarda `centers.schedule` como texto
   legible (ej. "Lun a Vie · 8:00 a.m. – 6:00 p.m. / Sáb · 9:00 a.m. – 1:00 p.m.").
   Aquí modelamos bloques editables y los serializamos/parseamos a ese texto.
   ========================================================================== */

/** Día de la semana, 0 = lunes … 6 = domingo. */
export type DayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as const;

/** Un tramo: días seleccionados + apertura/cierre en formato 24h "HH:MM". */
export interface ScheduleBlock {
  days: DayIndex[];
  open: string;
  close: string;
}

export const EMPTY_BLOCK: ScheduleBlock = { days: [], open: '', close: '' };

/** "08:00" → "8:00 a.m." (es-VE). Devuelve "" si la hora es inválida. */
export function formatHour12(hhmm: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return '';
  let h = Number(m[1]);
  const min = m[2];
  if (h < 0 || h > 23) return '';
  const suffix = h < 12 ? 'a.m.' : 'p.m.';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${min} ${suffix}`;
}

/** "8:00 a.m." → "08:00" (24h). Devuelve "" si no se puede parsear. */
export function parseHour12(label: string): string {
  const m = /^(\d{1,2}):(\d{2})\s*(a\.m\.|p\.m\.)$/i.exec(label.trim());
  if (!m) return '';
  let h = Number(m[1]);
  const min = m[2];
  const pm = m[3]!.toLowerCase() === 'p.m.';
  if (h === 12) h = 0;
  if (pm) h += 12;
  return `${String(h).padStart(2, '0')}:${min}`;
}

/** Agrupa los días en rangos consecutivos: [0,1,2,4] → "Lun a Mié, Vie". */
function formatDays(days: DayIndex[]): string {
  const sorted = [...days].sort((a, b) => a - b);
  const runs: Array<[DayIndex, DayIndex]> = [];
  for (const d of sorted) {
    const last = runs[runs.length - 1];
    if (last && d === last[1] + 1) last[1] = d;
    else runs.push([d, d]);
  }
  return runs
    .map(([a, b]) => {
      if (a === b) return DAY_LABELS[a];
      if (b === a + 1) return `${DAY_LABELS[a]}, ${DAY_LABELS[b]}`;
      return `${DAY_LABELS[a]} a ${DAY_LABELS[b]}`;
    })
    .join(', ');
}

/** Un bloque está completo si tiene días y ambas horas. */
export function isBlockComplete(b: ScheduleBlock): boolean {
  return b.days.length > 0 && b.open !== '' && b.close !== '' && b.close > b.open;
}

/** El horario es válido si hay al menos un bloque y todos están completos. */
export function isScheduleValid(blocks: ScheduleBlock[]): boolean {
  return blocks.length > 0 && blocks.every(isBlockComplete);
}

/** Serializa los bloques al texto legible que guarda la BD. */
export function serializeSchedule(blocks: ScheduleBlock[]): string {
  return blocks
    .filter(isBlockComplete)
    .map((b) => `${formatDays(b.days)} · ${formatHour12(b.open)} – ${formatHour12(b.close)}`)
    .join(' / ');
}

const DAY_BY_LABEL: Record<string, DayIndex> = {
  Lun: 0, Mar: 1, Mié: 2, Jue: 3, Vie: 4, Sáb: 5, Dom: 6,
};

/** Expande "Lun a Mié, Vie" de vuelta a [0,1,2,4]. */
function parseDays(text: string): DayIndex[] {
  const out = new Set<DayIndex>();
  for (const part of text.split(',').map((s) => s.trim())) {
    const m = part.split(/\s+a\s+/);
    if (m.length === 2) {
      const a = DAY_BY_LABEL[m[0]!.trim()];
      const b = DAY_BY_LABEL[m[1]!.trim()];
      if (a !== undefined && b !== undefined) {
        for (let d = a; d <= b; d++) out.add(d as DayIndex);
      }
    } else {
      const d = DAY_BY_LABEL[part];
      if (d !== undefined) out.add(d);
    }
  }
  return [...out].sort((a, b) => a - b);
}

/**
 * Intenta reconstruir los bloques desde el texto canónico. Si el texto no sigue
 * el formato (horario legado escrito a mano), devuelve `null` para que la UI
 * empiece vacía y muestre el valor original como referencia.
 */
export function parseSchedule(text: string): ScheduleBlock[] | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const blocks: ScheduleBlock[] = [];
  for (const chunk of trimmed.split('/').map((s) => s.trim())) {
    const dot = chunk.indexOf('·');
    if (dot === -1) return null;
    const daysText = chunk.slice(0, dot).trim();
    const hoursText = chunk.slice(dot + 1).trim();
    const hm = hoursText.split('–').map((s) => s.trim());
    if (hm.length !== 2) return null;
    const open = parseHour12(hm[0]!);
    const close = parseHour12(hm[1]!);
    const days = parseDays(daysText);
    if (!open || !close || days.length === 0) return null;
    blocks.push({ days, open, close });
  }
  return blocks.length > 0 ? blocks : null;
}

import type { Category } from '@/types';
import type { DonationDetail } from '@/lib/stats';
import { formatDateTime, formatLongDate } from '@/lib/format';

/* ===========================================================================
   Reporte imprimible (PRD §3.C). Formato limpio blanco y negro, tamaño carta,
   listo para imprimir o guardar como PDF. Se renderiza dentro de `.printable`;
   el CSS @media print (index.css) oculta el resto de la app al imprimir.
   Sin colores de marca: tinta negra sobre blanco para fotocopia/archivo.
   ========================================================================== */

export interface DonationReportProps {
  centerName: string;
  organization: string;
  generatedAt: Date;
  details: DonationDetail[];
  categories: Category[];
}

export function DonationReport({
  centerName,
  organization,
  generatedAt,
  details,
  categories,
}: DonationReportProps) {
  const totalDonors = details.length;
  const anonymous = details.filter((d) => d.donation.is_anonymous).length;
  const identified = totalDonors - anonymous;

  // Totales por categoría (cantidades exactas para rendición de cuentas).
  const catName = new Map(categories.map((c) => [c.id, c]));
  const catTotals = new Map<string, number>();
  for (const d of details) {
    for (const { item } of d.items) {
      catTotals.set(item.category_id, (catTotals.get(item.category_id) ?? 0) + item.quantity);
    }
  }

  return (
    <div className="printable mx-auto max-w-[800px] bg-white p-10 text-black">
      <style>{`
        .printable { font-family: 'Mulish', system-ui, sans-serif; }
        .printable h1, .printable h2, .printable th { font-family: 'Sora', system-ui, sans-serif; }
        .printable table { width: 100%; border-collapse: collapse; }
        .printable th, .printable td { border: 1px solid #000; padding: 6px 8px; text-align: left; font-size: 12px; }
        .printable th { background: #f0f0f0; }
      `}</style>

      {/* Encabezado */}
      <header className="mb-6 border-b-2 border-black pb-4">
        <h1 className="text-2xl font-extrabold">Reporte de donaciones</h1>
        <p className="mt-1 text-sm">{centerName} — {organization}</p>
        <p className="text-xs text-gray-700">Generado el {formatLongDate(generatedAt)}</p>
      </header>

      {/* Resumen */}
      <section className="mb-6 grid grid-cols-3 gap-4">
        <div className="border border-black p-3 text-center">
          <p className="text-3xl font-extrabold">{totalDonors}</p>
          <p className="text-xs uppercase tracking-wide">Donantes</p>
        </div>
        <div className="border border-black p-3 text-center">
          <p className="text-3xl font-extrabold">{identified}</p>
          <p className="text-xs uppercase tracking-wide">Identificados</p>
        </div>
        <div className="border border-black p-3 text-center">
          <p className="text-3xl font-extrabold">{anonymous}</p>
          <p className="text-xs uppercase tracking-wide">Anónimos</p>
        </div>
      </section>

      {/* Totales por categoría */}
      <section className="mb-6">
        <h2 className="mb-2 text-base font-extrabold">Total recibido por categoría</h2>
        <table>
          <thead>
            <tr>
              <th>Categoría</th>
              <th>Cantidad</th>
              <th>Unidad</th>
            </tr>
          </thead>
          <tbody>
            {[...catTotals.entries()].length === 0 ? (
              <tr><td colSpan={3}>Sin registros en el periodo.</td></tr>
            ) : (
              [...catTotals.entries()].map(([catId, qty]) => {
                const c = catName.get(catId);
                return (
                  <tr key={catId}>
                    <td>{c?.name ?? 'Sin categoría'}</td>
                    <td>{qty.toLocaleString('es-VE')}</td>
                    <td>{c?.unit ?? '—'}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>

      {/* Detalle por donante */}
      <section>
        <h2 className="mb-2 text-base font-extrabold">Detalle por donante</h2>
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Donante</th>
              <th>Productos entregados</th>
            </tr>
          </thead>
          <tbody>
            {details.map((d) => (
              <tr key={d.donation.id}>
                <td className="whitespace-nowrap">{formatDateTime(d.donation.created_at)}</td>
                <td>{d.donation.is_anonymous ? 'Anónimo' : d.donation.donor_name}</td>
                <td>
                  {d.items
                    .map((it) => `${it.item.product} (${it.item.quantity} ${it.categoryName})`)
                    .join('; ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer className="mt-8 border-t border-black pt-3 text-xs text-gray-700">
        Plataforma Unidos · Centros de Acopio Venezuela · Documento para rendición de cuentas.
      </footer>
    </div>
  );
}

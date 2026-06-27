import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Link2, AlertCircle } from 'lucide-react';
import { getHelpCategoryById, getHelpLinks } from '@/lib/api/helpResources';
import { useQuery } from '@/lib/hooks/useQuery';
import { Spinner, EmptyState } from '@/components/ui';

/* ===========================================================================
   Página pública · Categoría de ayuda humanitaria
   Ruta: /ayuda/:categoryId
   Muestra todos los enlaces de una categoría fetched desde Supabase.
   =========================================================================== */

export function AyudaCategoria() {
  const { categoryId } = useParams<{ categoryId: string }>();

  const categoryQuery = useQuery(
    () => getHelpCategoryById(categoryId!),
    [categoryId],
    !!categoryId,
  );

  const linksQuery = useQuery(
    () => (categoryId ? getHelpLinks(categoryId) : Promise.resolve([])),
    [categoryId],
    !!categoryId,
  );

  const category = categoryQuery.data;
  const links = linksQuery.data ?? [];

  return (
    <div className="min-h-screen bg-canvas text-ink">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-line-soft bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4">
          <Link
            to="/"
            className="flex items-center gap-2 font-body text-sm text-ink-muted transition-colors hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
          <div className="flex-1" />
          <span className="font-display text-sm font-black tracking-snug text-ink">Unidos</span>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-line-soft bg-surface">
        <div className="mx-auto max-w-5xl px-4 py-10">
          {categoryQuery.loading ? (
            <div className="flex items-center gap-3">
              <Spinner size="sm" />
              <span className="font-body text-sm text-ink-muted">Cargando…</span>
            </div>
          ) : (
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-azul/10">
                <Link2 className="h-5 w-5 text-azul" />
              </div>
              <div>
                <p className="font-body text-2xs font-bold uppercase tracking-eyebrow text-azul">
                  Portal de Ayuda
                </p>
                <h1 className="mt-1 font-display text-h2 font-black tracking-tightest text-ink">
                  {category?.name ?? 'Categoría'}
                </h1>
                <p className="mt-2 max-w-xl font-body text-sm text-ink-muted">
                  Recursos y enlaces de ayuda humanitaria disponibles para esta categoría.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Links */}
      <main className="mx-auto max-w-5xl px-4 py-8">
        {linksQuery.loading && (
          <div className="flex justify-center py-12">
            <Spinner size="sm" label="Cargando recursos…" />
          </div>
        )}

        {!linksQuery.loading && links.length === 0 && (
          <EmptyState
            icon={<AlertCircle className="h-6 w-6" />}
            title="Sin recursos disponibles"
            description="Esta categoría no tiene enlaces todavía. El equipo los irá agregando pronto."
          />
        )}

        {!linksQuery.loading && links.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {links.map((link) => (
              <a
                key={link.id}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col gap-1.5 rounded-2xl border border-line-soft bg-surface p-4 transition hover:border-azul hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-display text-sm font-bold text-ink transition-colors group-hover:text-azul">
                    {link.label}
                  </span>
                  <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-muted transition-colors group-hover:text-azul" />
                </div>
                {link.description && (
                  <p className="font-body text-xs leading-relaxed text-ink-muted">
                    {link.description}
                  </p>
                )}
              </a>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-line-soft">
        <div className="mx-auto max-w-5xl px-4 py-6">
          <p className="text-center font-body text-xs text-ink-muted">
            ¿Necesitas encontrar un centro de acopio?{' '}
            <Link to="/" className="text-azul hover:underline">
              Ver centros cerca de ti →
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}

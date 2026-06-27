import { Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, AlertCircle, Phone, Globe, FileText, Search, Users } from 'lucide-react';

const resources = [
  {
    category: 'Plataformas ciudadanas – Terremoto 2026',
    icon: Search,
    links: [
      {
        label: 'Desaparecidos Venezuela',
        description: 'Plataforma ciudadana para reportar y buscar personas desaparecidas tras los terremotos del 24 de junio de 2026. Más de 40.000 reportes activos.',
        href: 'https://www.desaparecidosvenezuela.com/',
      },
      {
        label: 'CICR – Restoring Family Links (Cruz Roja Venezuela)',
        description: 'Sistema internacional de la Cruz Roja para reencontrarse con familiares separados por el desastre.',
        href: 'https://familylinks.icrc.org/organization/venezuelan-red-cross',
      },
    ],
  },
  {
    category: 'Organizaciones Humanitarias',
    icon: Globe,
    links: [
      {
        label: 'Cruz Roja Venezolana',
        description: 'Asistencia y protección a personas afectadas por desastres. Canal oficial para solicitar búsqueda de familiares.',
        href: 'https://cruzroja.ve/',
      },
      {
        label: 'ACNUR Venezuela',
        description: 'Canal de la Agencia de la ONU para Refugiados con información de emergencia y asistencia humanitaria.',
        href: 'https://help.unhcr.org/venezuela/',
      },
    ],
  },
  {
    category: 'Derechos Humanos y Registro',
    icon: FileText,
    links: [
      {
        label: 'PROVEA – Derechos Humanos',
        description: 'Organización venezolana con seguimiento y registro de casos de personas desaparecidas.',
        href: 'https://provea.org/',
      },
      {
        label: 'Foro Penal',
        description: 'Registro de detenidos y desaparecidos en Venezuela. Asistencia legal gratuita a las personas afectadas.',
        href: 'https://foropenal.com/',
      },
    ],
  },
  {
    category: 'Datos Operacionales ONU',
    icon: Phone,
    links: [
      {
        label: 'Situación Venezuela – Portal ACNUR',
        description: 'Datos operacionales y canales de ayuda de la ONU para la emergencia en Venezuela.',
        href: 'https://data.unhcr.org/en/situations/vensit',
      },
      {
        label: 'CICR en Venezuela',
        description: 'Presencia y operaciones del Comité Internacional de la Cruz Roja en el país.',
        href: 'https://www.icrc.org/en/where-we-work/venezuela',
      },
    ],
  },
];

export function PersonasDesaparecidas() {
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
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
              <Users className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="font-body text-2xs font-bold uppercase tracking-eyebrow text-amber-600">
                Personas desaparecidas
              </p>
              <h1 className="mt-1 font-display text-h2 font-black tracking-tightest text-ink">
                ¿Conoces personas desaparecidas?
              </h1>
              <p className="mt-2 max-w-2xl font-body text-sm text-ink-muted">
                Si buscas a alguien con quien perdiste contacto durante la emergencia, estas
                plataformas y organizaciones pueden ayudarte a localizarlas o registrar su búsqueda.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Aviso */}
      <div className="mx-auto max-w-5xl px-4 pt-6">
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/40 dark:bg-amber-900/10">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="font-body text-xs text-amber-800 dark:text-amber-300">
            En caso de emergencia inmediata, contacta primero a las autoridades locales. Los enlaces
            a continuación son recursos de apoyo para la búsqueda y registro de personas.
          </p>
        </div>
      </div>

      {/* Recursos */}
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="grid gap-8">
          {resources.map((group) => {
            const Icon = group.icon;
            return (
              <div key={group.category}>
                <div className="mb-3 flex items-center gap-2">
                  <Icon className="h-4 w-4 text-azul" />
                  <h2 className="font-display text-xs font-black uppercase tracking-eyebrow text-azul">
                    {group.category}
                  </h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {group.links.map((link) => (
                    <a
                      key={link.label}
                      href={link.href}
                      className="group flex flex-col gap-1.5 rounded-2xl border border-line-soft bg-surface p-4 transition hover:border-azul hover:shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-display text-sm font-bold text-ink transition-colors group-hover:text-azul">
                          {link.label}
                        </span>
                        <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-muted transition-colors group-hover:text-azul" />
                      </div>
                      <p className="font-body text-xs leading-relaxed text-ink-muted">
                        {link.description}
                      </p>
                    </a>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-line-soft">
        <div className="mx-auto max-w-5xl px-4 py-6">
          <p className="text-center font-body text-xs text-ink-muted">
            ¿Necesitas encontrar un centro de acopio cercano?{' '}
            <Link to="/" className="text-azul hover:underline">
              Ver centros cerca de ti →
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}

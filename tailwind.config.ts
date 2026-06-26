import type { Config } from 'tailwindcss';

/* ===========================================================================
   UNIDOS · Tema Tailwind (v3)
   Los colores apuntan a variables CSS (var(--color-*)) definidas en
   src/styles/tokens.css. Eso permite que UNA sola clase (p. ej. `bg-surface`)
   resuelva el valor correcto en tema claro y oscuro sin escribir variantes
   `dark:` en cada componente. El tricolor de marca se mantiene constante;
   solo cambian superficies, texto, bordes y fondos de estado.
   darkMode: 'class' → el tema se controla añadiendo `.dark` en <html>.
   =========================================================================== */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Marca · tricolor (constante en ambos temas)
        amarillo: { DEFAULT: 'var(--color-amarillo)', ink: 'var(--color-amarillo-ink)' },
        azul: { DEFAULT: 'var(--color-azul)', ink: 'var(--color-azul-ink)' },
        rojo: { DEFAULT: 'var(--color-rojo)', ink: 'var(--color-rojo-ink)' },

        // Superficie / fondo (cambia por tema)
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        'surface-2': 'var(--color-surface-2)',
        'surface-3': 'var(--color-surface-3)',
        bone: 'var(--color-overlay-bone)',

        // Texto (cambia por tema)
        ink: 'var(--color-text)',
        body: 'var(--color-text-body)',
        muted: 'var(--color-text-muted)',
        subtle: 'var(--color-text-subtle)',

        // Bordes
        line: 'var(--color-border)',
        'line-soft': 'var(--color-border-soft)',

        // Estado — disponibilidad de centros
        success: {
          DEFAULT: 'var(--color-success)',
          ink: 'var(--color-success-ink)',
          bg: 'var(--color-success-bg)',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          ink: 'var(--color-warning-ink)',
          bg: 'var(--color-warning-bg)',
        },
        danger: {
          DEFAULT: 'var(--color-danger)',
          ink: 'var(--color-danger-ink)',
          bg: 'var(--color-danger-bg)',
        },
      },

      fontFamily: {
        display: ['Sora', 'system-ui', 'sans-serif'],
        body: ['Mulish', 'system-ui', 'sans-serif'],
      },

      fontSize: {
        '3xs': ['11px', '1'],
        '2xs': ['12px', '1.3'],
        xs: ['13px', '1.4'],
        sm: ['14px', '1.5'],
        base: ['15px', '1.62'],
        lg: ['19px', '1.3'],
        h3: ['20px', '1.1'],
        h2: ['26px', '1.1'],
        h1: ['34px', '1'],
        display: ['62px', '0.9'],
      },

      letterSpacing: {
        tightest: '-0.03em',
        snug: '-0.02em',
        wide: '0.08em',
        eyebrow: '0.16em',
      },

      fontWeight: {
        black: '800',
      },

      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '14px',
        xl: '18px',
        pill: '24px',
      },

      spacing: {
        control: '48px',
        'control-sm': '30px',
      },

      boxShadow: {
        // También por variable: en oscuro el "glow" cálido se atenúa.
        card: 'var(--shadow-card)',
        float: 'var(--shadow-float)',
        'ring-azul': 'var(--shadow-ring-azul)',
      },
    },
  },
  plugins: [],
} satisfies Config;

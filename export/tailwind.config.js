/* ===========================================================================
   UNIDOS · Tailwind theme tokens
   Pega `theme.extend` en tu tailwind.config.js (v3) o úsalo de referencia.
   Para Tailwind v4: traslada estos valores a @theme en tu CSS.
   =========================================================================== */

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,html}'],
  theme: {
    extend: {
      colors: {
        // Marca · tricolor
        amarillo: { DEFAULT: '#f4c021', ink: '#5a4500' },
        azul:     { DEFAULT: '#1f6fd6', ink: '#1a5cb4' },
        rojo:     { DEFAULT: '#e23b2e', ink: '#a83327' },

        // Superficie / fondo
        bg:        '#f4ede0',
        surface:   '#fffaf1',
        'surface-2': '#efe7d8',
        'surface-3': '#f1ead9',
        bone:      '#e9d9bb',

        // Texto
        ink:        '#211e19',
        body:       '#6e6557',
        muted:      '#8a8073',
        subtle:     '#a59a89',

        // Bordes
        line:      '#e4dccd',
        'line-soft': '#e9e1d2',

        // Estado — disponibilidad de centros
        success: { DEFAULT: '#2f9e5b', ink: '#23774a', bg: '#e0f1e7' },
        warning: { DEFAULT: '#caa015', ink: '#8a6a12', bg: '#f7eccb' },
        danger:  { DEFAULT: '#e23b2e', ink: '#a83327', bg: '#f7ddd9' },
      },

      fontFamily: {
        display: ['Sora', 'system-ui', 'sans-serif'],
        body:    ['Mulish', 'system-ui', 'sans-serif'],
      },

      fontSize: {
        // [size, lineHeight]
        '3xs':     ['11px', '1'],
        '2xs':     ['12px', '1.3'],
        xs:        ['13px', '1.4'],
        sm:        ['14px', '1.5'],
        base:      ['15px', '1.62'],
        lg:        ['19px', '1.3'],
        h3:        ['20px', '1.1'],
        h2:        ['26px', '1.1'],
        h1:        ['34px', '1'],
        display:   ['62px', '0.9'],
      },

      letterSpacing: {
        tightest: '-0.03em',
        snug:     '-0.02em',
        wide:     '0.08em',
        eyebrow:  '0.16em',
      },

      fontWeight: {
        // Sora/Mulish cargan 400–800; black = 800
        black: '800',
      },

      borderRadius: {
        sm:   '8px',
        md:   '12px',
        lg:   '14px',
        xl:   '18px',
        pill: '24px',
      },

      spacing: {
        // base 4 (Tailwind ya cubre la mayoría; añadimos alturas de control)
        control:    '48px',
        'control-sm': '30px',
      },

      boxShadow: {
        card:  '0 14px 34px -16px rgba(160,110,40,.40)',
        float: '0 40px 90px -36px rgba(120,100,70,.45)',
        'ring-azul': '0 0 0 6px rgba(31,111,214,.22)',
      },
    },
  },
  plugins: [],
};

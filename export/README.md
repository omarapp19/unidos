# Unidos — Sistema de diseño

Tokens y guía de estilo para **Unidos**, la app de centros de acopio (dirección visual *tricolor + crema*, modo claro y cálido).

## Archivos

| Archivo | Para qué |
|---|---|
| `tokens.css` | Variables CSS (`var(--color-azul)`…). Vanilla, cualquier framework. |
| `tailwind.config.js` | Tema para **Tailwind v3** (`theme.extend`). |
| `theme.css` | Tema para **Tailwind v4** (`@theme`). |
| `Guía de estilo Unidos.dc.html` | Referencia visual navegable (colores, tipografía, componentes). |

## Fuentes

Sora (titulares/números) + Mulish (texto/botones), ambas en Google Fonts:

```html
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Mulish:wght@400;500;600;700;800&display=swap" rel="stylesheet">
```

## Uso — CSS vanilla

```css
@import "./tokens.css";

.boton-principal {
  background: var(--color-rojo);
  color: #fff;
  font: var(--weight-black) var(--text-sm)/1 var(--font-body);
  height: var(--control-h);
  border-radius: var(--radius-pill);
}
```

## Uso — Tailwind v3

Copia `theme.extend` de `tailwind.config.js`. Luego:

```html
<button class="bg-rojo text-white font-display font-black rounded-pill h-control shadow-card">
  Cómo llegar →
</button>
<span class="bg-success-bg text-success-ink text-2xs rounded-pill px-3 py-1">Activo</span>
```

## Uso — Tailwind v4

```css
@import "tailwindcss";
@import "./theme.css";
```

## Convenciones

- **Tricolor** (amarillo/azul/rojo) = identidad; aparece como banda (`flagbar`) y en acentos. No saturar: el fondo manda en crema.
- **Rojo** = acción principal (botones CTA). **Azul** = confianza/ubicación. **Amarillo** = energía/destacados.
- **Estados de centro**: `success` Activo · `warning` Lleno · `danger` Cerrado. Cada uno con par `-ink` (texto) y `-bg` (fondo de chip).
- **Botones e inputs**: altura 48px, radio `pill` (24px), peso `black` (800).
- **Titulares y números**: Sora con tracking negativo (`snug`/`tightest`). **Texto**: Mulish, pesos 600–700.
- Accesibilidad: legible bajo el sol y para usuarios mayores — alto contraste, hit targets ≥ 44px.

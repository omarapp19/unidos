# PRD — Plataforma de Centros de Acopio (Venezuela)

**Documento de Requerimientos de Producto**
Versión 1.0 · 25 de junio de 2026 · Proyecto sin fines de lucro

---

## 1. Contexto y motivación

El 24 de junio de 2026 ocurrió un terremoto en Venezuela que dejó damnificados, pérdida
de hogares y una operación de ayuda humanitaria que se prevé extensa (semanas o meses,
dada la magnitud de la catástrofe). La solidaridad ciudadana es masiva, pero el cuello
de botella no es la falta de voluntad de ayudar, sino la **información y la logística**:
la gente quiere donar pero no sabe dónde quedan exactamente los centros de acopio, cuál
es el más cercano, ni qué insumos hacen falta. Las imágenes con direcciones de centros
circulan por redes y se pierden u olvidan.

Esta plataforma resuelve esa brecha: un lugar centralizado donde (1) cualquier persona
encuentra el centro de acopio activo más cercano para ir a donar, y (2) cada centro
lleva un control interno simple de lo que recibe y de quién lo dona.

> **Naturaleza del proyecto.** Es una iniciativa **sin fines de lucro, sin monetización
> y sin publicidad**. Nadie cobra por desarrollarla; los costos de servidor/dominio los
> asume el equipo. El objetivo es ayudar a la mayor cantidad de personas posible.

## 2. Visión del producto

> Conectar la intención de ayudar con el lugar correcto, en el menor número de pasos
> posible, y dar a cada centro de acopio una herramienta mínima pero confiable para
> registrar y rendir cuentas de lo que recibe.

La plataforma es una solución de **doble propósito**:

- **Para la ciudadanía (público):** un faro de información — encontrar el centro más
  cercano y ver qué se está donando más a nivel general.
- **Para los centros de acopio (privado):** una herramienta de gestión interna —
  registrar donaciones sobre la marcha, ver estadísticas del propio centro y generar
  reportes para rendición de cuentas.

## 3. Principios de diseño

1. **Inmediatez.** La función más importante (ver el mapa y el centro más cercano) debe
   estar disponible sin registro, sin login y sin fricción.
2. **Simplicidad operativa.** El registro de una donación debe poder hacerse en segundos
   y desde el celular, con poca capacitación. En un centro real hay prisa y poco tiempo.
3. **Privacidad y seguridad operativa.** El público nunca ve marcas comerciales ni
   cantidades exactas (solo porcentajes por categoría). Los donantes pueden ser
   anónimos. Los datos sensibles solo los ve el administrador de su propio centro.
4. **Confianza institucional.** Solo organizaciones autorizadas (p. ej. coordinadas con
   la Cruz Roja u organismos reconocidos) deberían figurar como centros gestionables,
   ya que ellas manejan el traslado real de insumos hacia las zonas afectadas.
5. **Extensible en el tiempo.** La ayuda se recibirá por mucho tiempo; el producto debe
   crecer "poco a poco" sin reescribirse: primero lo básico, luego estadísticas y más.
6. **Acceso desde el celular.** La mayoría de usuarios y administradores usarán teléfono;
   el diseño es mobile-first.

## 4. Usuarios y roles

| Rol | Descripción | Acceso |
|-----|-------------|--------|
| **Ciudadano / Donante** | Persona que quiere donar y busca dónde hacerlo. | Público, sin cuenta. |
| **Administrador de centro** | Encargado(a) de un centro de acopio. Registra donaciones y consulta su panel. | Requiere cuenta (login). |
| **Coordinador / Superadmin** | Equipo del proyecto u organización autorizante. Aprueba centros y modera el mapa. | Cuenta con permisos elevados. |

## 5. Alcance del MVP (lo crítico)

> Según el líder técnico (Omar), lo *más importante al inicio* es el mapa con los centros
> y el mini-inventario interno de cada centro ("llegó Pedrito, una caja de agua y una de
> enlatados; o Pedrito anónimo"). Las estadísticas y lo demás llegan después, poco a poco.

El MVP se organiza en **tres módulos**, alineados con la propuesta del líder técnico y la
de Kevin:

### Módulo 1 — Vista pública (sin login)

- **1.A Mapa interactivo.** Muestra todos los centros de acopio activos mediante pines.
  Con permiso de ubicación, detecta al usuario y **resalta el centro más cercano**; sin
  permiso, permite explorar el mapa libremente.
- **1.B Ficha del centro.** Al tocar un pin: nombre, dirección, horario, estado
  (activo/lleno/cerrado), insumos que más necesita y botón "Cómo llegar" (abrir en
  Google/Apple Maps).
- **1.C Gráfico general de donaciones.** Tendencia de lo donado en toda la red, agrupado
  por categorías generales (Agua, Granos, Enlatados, Insumos Médicos, etc.) y mostrado
  en **porcentajes** (p. ej. "Granos: 40%"). **Nunca** marcas comerciales ni cantidades
  exactas. *(Puede entrar al final del MVP o como primer "extra" — ver §6.)*

### Módulo 2 — Autenticación de centros

- Registro e inicio de sesión para administradores de centros de acopio.
- Un centro recién registrado queda **pendiente de aprobación** por un coordinador antes
  de aparecer público en el mapa (garantiza que sean organizaciones autorizadas).

### Módulo 3 — Panel de gestión (privado por centro)

Panel privado, visible solo para el administrador de ese centro. Tres secciones:

- **3.A Dashboard de estadísticas del centro.** Métricas rápidas: total de donantes
  hoy, donantes identificados vs. anónimos, productos más donados, y cantidades exactas
  acumuladas por categoría (visibles solo para el centro).
- **3.B Recepción de productos (registro rápido).** Pantalla operativa para registrar
  insumos al recibirlos:
  - Campo de **nombre del donante** (opcional; si se deja vacío → cuenta como anónimo).
  - **Selector de categoría** del producto.
  - **Tipo/descripción del producto** y **cantidad**.
  - Posibilidad de **añadir varias filas** (varios productos del mismo donante) y un
    botón **Registrar donación**.
  - El stock del centro se actualiza automáticamente tras cada registro.
- **3.C Historial de donantes y reportes.** Tabla cronológica de cada entrada (nombre o
  "Anónimo"); al expandir una fila se ve el desglose de lo entregado. Botón **Generar
  reporte** que compila los donantes de un periodo, cuenta los anónimos y produce un
  formato limpio (blanco y negro, tamaño carta) listo para imprimir o guardar como PDF.

### Criterios de aceptación del MVP

- Un ciudadano sin cuenta abre la web y, en menos de 10 segundos, ve el mapa y el centro
  más cercano con su dirección y cómo llegar.
- Un administrador registra una donación con donante anónimo y dos productos en menos de
  30 segundos desde el celular.
- El stock y el contador de donantes del día se actualizan al instante tras registrar.
- El público no puede ver cantidades exactas, nombres de donantes ni marcas.
- Un administrador genera un reporte imprimible del día.

## 6. Funcionalidades adicionales (mayor valor, post-MVP)

Priorizadas para maximizar el alcance de la ayuda, en orden sugerido:

1. **Panel de "insumos prioritarios" por centro.** Cada centro marca qué necesita con
   urgencia; el mapa filtra "centros que necesitan agua / medicinas", orientando al
   donante hacia las necesidades reales y evitando saturación de unos y desabasto de otros.
2. **Estado de capacidad del centro** (Recibiendo / Lleno / Cerrado temporal) para no
   enviar gente a centros saturados.
3. **Filtros y búsqueda** en el mapa: por categoría aceptada, por zona, por estado.
4. **Compartir centro** por WhatsApp con dirección y ubicación (canal real de difusión).
5. **Verificación / sello de centro autorizado** (p. ej. coordinado con Cruz Roja) visible
   al público, para generar confianza.
6. **Multi-usuario por centro:** varios voluntarios registrando donaciones en el mismo
   centro con una cuenta de administrador que los gestiona.
7. **Estadísticas globales públicas enriquecidas:** evolución temporal, total de centros
   activos, total de donantes (sin datos sensibles).
8. **Modo de baja conectividad / PWA instalable:** registro offline que sincroniza luego;
   clave en zonas con servicio intermitente tras el sismo.
9. **Soporte multi-ciudad / multi-región:** escalar más allá de una ciudad conforme la
   ayuda se extiende a otras zonas afectadas.
10. **Lista pública de insumos sugeridos / qué NO llevar**, para mejorar la calidad de
    las donaciones.

### Fuera de alcance (explícitamente)

- **Página de personas desaparecidas/cadáveres:** ya existen plataformas dedicadas y bien
  hechas; sumar otra solo diluye la información. El foco es centros de acopio.
- **Logística de traslado de insumos:** la realiza la Cruz Roja u organizaciones
  autorizadas; la plataforma **no** mueve mercancía ni coordina rutas.
- **Donaciones de dinero / pagos en línea:** el proyecto no monetiza ni procesa dinero.
- **Marketplace o emparejamiento donante-beneficiario individual.**

## 7. Reglas de privacidad y datos (resumen)

- Vista pública: solo categorías y porcentajes; jamás cantidades exactas, marcas ni
  nombres de donantes.
- El nombre del donante es **opcional**; sin nombre se registra como "Anónimo".
- Los datos de inventario y donantes de un centro solo son visibles para ese centro (y el
  superadmin para moderación).
- La ubicación del ciudadano se usa solo en el dispositivo para calcular el centro más
  cercano; no es necesario almacenarla.

## 8. Métricas de éxito

- Tiempo a "encontré mi centro más cercano" < 10 s.
- Nº de centros activos en el mapa y cobertura geográfica.
- Nº de donaciones registradas / donantes atendidos por día.
- % de centros que usan el reporte para rendición de cuentas.
- Tiempo medio para registrar una donación (objetivo < 30 s).

## 9. Equipo

- **Omar** — líder técnico (idea original e impulso del proyecto).
- **Kevin** — backend (autor de la propuesta funcional base).
- **Sofía** — frontend.
- Colaboradores adicionales mencionados (p. ej. Jonathan Núñez) bienvenidos; modelo de
  "cada quien pone su grano de arena".

---

*Documento vivo. El detalle de implementación (stack, modelo de datos, APIs y seguridad)
está en `REQUISITOS-TECNICOS.md`.*

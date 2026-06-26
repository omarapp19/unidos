# Propuesta — Plataforma de Centros de Acopio

> Documento original elaborado por **Kevin** (backend). Convertido a Markdown para
> lectura en el contexto del proyecto. Fuente: `Cetros de acopio.pdf`.

## 1. Introducción

En situaciones de crisis humanitarias, emergencias climáticas o campañas de apoyo
social, la solidaridad de las personas suele manifestarse de forma masiva. Sin
embargo, el mayor desafío no radica en la escasez de intenciones de ayuda, sino en la
**logística y la distribución de la información**. Con frecuencia, los ciudadanos que
desean colaborar desconocen a dónde acudir, cuáles son los puntos de recolección
autorizados más cercanos o qué insumos son prioritarios en tiempo real, lo que genera
cuellos de botella en algunos centros y desabastecimiento en otros.

Este proyecto nace para resolver esa brecha mediante el desarrollo de una plataforma
web centralizada, interactiva y de acceso público. El sistema actuará como un puente
tecnológico entre la ciudadanía y los administradores de los centros de acopio,
optimizando la visibilidad de los puntos de ayuda y digitalizando el control de los
inventarios recibidos de manera transparente y eficiente.

## 2. ¿De qué trata el proyecto?

La plataforma es una solución digital de doble propósito diseñada bajo principios de
**inmediatez, facilidad de uso y protección de datos**. A través de un mapa interactivo
geolocalizado, centraliza la información de la red de apoyo de la ciudad, dividiendo su
alcance en dos experiencias clave:

- **Para la Ciudadanía (Acceso Público):** Funciona como un faro de información.
  Permite a cualquier usuario ubicar en tiempo real todos los centros de acopio
  activos, identificar instantáneamente el más cercano a su ubicación geográfica y
  consultar gráficos estadísticos dinámicos. Estas estadísticas muestran la tendencia
  de lo que ya se ha donado por grandes categorías (alimentos, medicinas, agua, etc.)
  en toda la ciudad, omitiendo marcas o números exactos para proteger la seguridad
  operativa y orientar el esfuerzo ciudadano hacia las necesidades reales.

- **Para la Gestión Logística (Panel de Administración):** Funciona como una
  herramienta de control interno para los responsables de cada centro. Les permite
  registrar formalmente su espacio en el mapa, cargar los flujos de insumos recibidos
  por categorías y llevar un control diario del volumen de donantes —respetando la
  opción del anonimato—. Finalmente, automatiza la rendición de cuentas mediante un
  módulo de reportes diseñado para impresión física o archivado digital.

En esencia, no se trata solo de un mapa o de un inventario; es una **herramienta de
coordinación comunitaria** que transforma la intención de ayudar en un proceso
organizado, medible y de alto impacto para la ciudad.

## 3. Vista del Usuario Común (Pantalla Pública de Consulta)

Esta es la página de aterrizaje a la que ingresa cualquier ciudadano. Su función
principal es dar información inmediata y orientar la intención de ayuda de forma
inteligente.

- **Función de Mapa Interactivo:** Muestra de forma visual todos los centros de acopio
  disponibles en la ciudad mediante pines o marcadores.

- **Función de Geolocalización Activa:** Si el usuario da permisos de ubicación en su
  teléfono o PC, el sistema detecta sus coordenadas y resalta automáticamente cuál es
  el centro de acopio físicamente más cercano a él. Si no da permisos, simplemente le
  permite explorar el mapa de la ciudad con total libertad.

- **Función de Estadísticas en Vivo:** Muestra un panel gráfico con las tendencias de
  donación de toda la ciudad en tiempo real. Su regla estricta es que **no muestra
  marcas comerciales ni números exactos** (por ejemplo, prohibido mostrar "500 bolsas
  de arroz Marca X"). En su lugar, agrupa todo por categorías generales (Agua, Granos,
  Enlatados, Insumos Médicos) y muestra el impacto mediante porcentajes (por ejemplo,
  "Granos: 40% del total donado"). Esto sirve para que el ciudadano sepa qué es lo que
  más se está donando y qué hace falta.

## 4. Estructura del Panel de Gestión (Administrador)

Al iniciar sesión, el encargado del centro de acopio entrará a un panel administrativo
con un menú lateral para navegar de forma organizada entre los siguientes módulos
independientes.

### 4.1. Módulo de Estadísticas del Centro (Dashboard)

Este es el centro de control visual y analítico del administrador. Su función es
mostrar el rendimiento y la salud operativa de su centro en específico.

- **Métricas Clave en Pantalla:** Muestra contadores rápidos del impacto del centro,
  tales como el número total de donantes del día, cuántos de ellos han sido
  identificados y cuántos anónimos.

- **Gráficos Internos de Inventario:** A diferencia de la vista pública, aquí el
  administrador **sí ve las cantidades exactas acumuladas** por cada grupo de productos
  (ej. "Insumos Médicos: 1,200 unidades", "Agua: 450 litros"). Muestra gráficos de
  barras o líneas que le permiten entender el flujo de entradas por días o semanas para
  saber cuándo reciben más ayuda.

### 4.2. Módulo de Productos Donados (Inventario y Carga)

Este módulo combina la interfaz de registro rápido con el control del stock físico del
centro.

- **Formulario de Recepción Dinámica:** La herramienta unificada para registrar
  donaciones sobre la marcha. El administrador escribe el nombre del donante (o lo deja
  en blanco si es anónimo) y añade de forma dinámica múltiples filas para cargar
  diferentes productos a la vez (Grupo + Cantidad) en un solo clic.

- **Tabla de Stock Actual:** Justo abajo del formulario o en una pestaña continua,
  muestra el inventario consolidado en tiempo real. Cada vez que se procesa una
  donación, las cantidades de esta tabla se actualizan automáticamente.

### 4.3. Módulo de Registro de Donantes (Base de Datos e Impresión)

Este módulo funciona como el libro contable o el historial de auditoría de las personas
que han interactuado con el centro de acopio.

- **Historial de Donaciones:** Una tabla cronológica detallada que lista cada entrada.
  Si el registro fue identificado, muestra el nombre del ciudadano; si fue anónimo,
  muestra la etiqueta "Anónimo". Al hacer clic en cualquier fila, se puede desplegar el
  desglose exacto de lo que esa persona entregó.

- **Herramienta de Reportería e Impresión:** En esta sección se encuentra el botón para
  **Generar Reporte**. Al presionarlo, el sistema compila toda la lista de donantes del
  periodo seleccionado, calcula el número de donantes anónimos y genera un formato
  limpio en blanco y negro (optimizado para tamaño carta) listo para mandar a la
  impresora o guardar como PDF para rendición de cuentas.

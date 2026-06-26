/* ===========================================================================
   Datos mock · simulan lo que vendría de Supabase (ver REQUISITOS-TECNICOS.md §4).
   Respetan EXACTAMENTE los tipos de `@/types`. Fechas ISO string como el SDK.
   Centros y categorías alineados a la propuesta visual "Unidos · Propuesta 02".
   Coordenadas reales de zonas de Caracas / Los Teques (Venezuela).
   ========================================================================== */

import type {
  Category,
  Center,
  Donation,
  DonationItem,
  Profile,
} from '@/types';

/* --- Catálogo de categorías ------------------------------------------- */

export const categories: Category[] = [
  { id: 'cat-agua', name: 'Agua', unit: 'litros' },
  { id: 'cat-alimentos', name: 'Alimentos', unit: 'unidades' },
  { id: 'cat-ropa', name: 'Ropa', unit: 'unidades' },
  { id: 'cat-medicinas', name: 'Medicinas', unit: 'unidades' },
  { id: 'cat-aseo', name: 'Aseo personal', unit: 'unidades' },
  { id: 'cat-panales', name: 'Pañales', unit: 'unidades' },
];

/* --- Centros de acopio ------------------------------------------------- */
/* Solo los `is_approved` aparecen en la vista pública. */

export const centers: Center[] = [
  {
    id: 'ctr-liceo',
    name: 'Liceo Andrés Bello',
    address: 'Av. Francisco de Miranda, Chacao, Caracas',
    lat: 10.4978,
    lng: -66.8543,
    phone: '+58 212 555 0142',
    whatsapp: '584125550142',
    instagram: 'cruzrojaven',
    website: 'https://www.cruzrojavenezolana.org',
    email: 'acopio.chacao@cruzroja.org.ve',
    schedule: 'Lun a Dom · 8:00 a.m. – 6:00 p.m.',
    status: 'receiving',
    is_approved: true,
    is_verified: true,
    organization: 'Cruz Roja Venezolana',
    created_at: '2026-06-24T12:00:00.000Z',
  },
  {
    id: 'ctr-candelaria',
    name: 'Parroquia La Candelaria',
    address: 'Esq. Candelaria, Av. Urdaneta, Libertador, Caracas',
    lat: 10.5061,
    lng: -66.9036,
    phone: null,
    whatsapp: '584142223344',
    instagram: 'parroquialacandelaria',
    website: null,
    email: null,
    schedule: 'Lun a Vie · 8:00 a.m. – 4:00 p.m.',
    status: 'receiving',
    is_approved: true,
    is_verified: false,
    organization: 'Parroquia La Candelaria',
    created_at: '2026-06-24T14:30:00.000Z',
  },
  {
    id: 'ctr-polideportivo',
    name: 'Polideportivo Chacao',
    address: 'Av. Tamanaco, El Rosal, Chacao, Caracas',
    lat: 10.4889,
    lng: -66.8612,
    phone: '+58 212 555 0233',
    whatsapp: '584125550233',
    instagram: 'alcaldiadechacao',
    website: 'https://www.chacao.gob.ve',
    email: 'acopio@chacao.gob.ve',
    schedule: 'Lun a Dom · 7:00 a.m. – 7:00 p.m.',
    status: 'full',
    is_approved: true,
    is_verified: true,
    organization: 'Alcaldía de Chacao',
    created_at: '2026-06-24T16:00:00.000Z',
  },
  {
    id: 'ctr-baruta',
    name: 'Punto de Recolección Baruta',
    address: 'Calle Sucre con Av. El Hatillo, Baruta, Caracas',
    lat: 10.4361,
    lng: -66.8757,
    phone: '+58 212 555 0198',
    whatsapp: '584125550198',
    instagram: 'alcaldiabaruta',
    website: 'https://www.baruta.gob.ve',
    email: null,
    schedule: 'Lun a Sáb · 9:00 a.m. – 5:00 p.m.',
    status: 'receiving',
    is_approved: true,
    is_verified: true,
    organization: 'Alcaldía de Baruta',
    created_at: '2026-06-25T09:00:00.000Z',
  },
  {
    id: 'ctr-losteques',
    name: 'Plaza Bolívar, Los Teques',
    address: 'Plaza Bolívar, Los Teques, Miranda',
    lat: 10.3409,
    lng: -67.0419,
    phone: '+58 212 555 0311',
    whatsapp: null,
    instagram: 'alcaldiaguaicaipuro',
    website: null,
    email: null,
    schedule: 'Sáb y Dom · 9:00 a.m. – 3:00 p.m.',
    status: 'closed',
    is_approved: true,
    is_verified: false,
    organization: 'Alcaldía de Guaicaipuro',
    created_at: '2026-06-25T10:15:00.000Z',
  },
  {
    // Pendiente de aprobación: NO debe verse en el mapa público.
    id: 'ctr-pendiente',
    name: 'Centro Vecinal Los Palos Grandes',
    address: '4ta Av. Los Palos Grandes, Chacao, Caracas',
    lat: 10.5012,
    lng: -66.8421,
    phone: '+58 212 555 0400',
    whatsapp: '584125550400',
    instagram: null,
    website: null,
    email: null,
    schedule: 'Por confirmar',
    status: 'receiving',
    is_approved: false,
    is_verified: false,
    organization: 'Junta de Vecinos Los Palos Grandes',
    created_at: '2026-06-25T18:00:00.000Z',
  },
];

/** Solo los centros aprobados (lo que consume la vista pública). */
export const approvedCenters: Center[] = centers.filter((c) => c.is_approved);

/* --- Insumos prioritarios por centro (post-MVP §6.1, ya en el mock) ---- */

export const urgentSuppliesByCenter: Record<string, string[]> = {
  'ctr-liceo': ['Agua', 'Medicinas', 'Pañales'],
  'ctr-candelaria': ['Agua', 'Ropa'],
  'ctr-polideportivo': ['Alimentos'],
  'ctr-baruta': ['Alimentos', 'Aseo personal'],
  'ctr-losteques': [],
};

/* --- Sesión simulada: administrador autenticado ----------------------- */
/* El admin gestiona el Liceo Andrés Bello (avatar "AB"). */

export const currentProfile: Profile = {
  id: 'prof-ana',
  center_id: 'ctr-liceo',
  role: 'admin',
  full_name: 'Ana Belén Torres',
};

/** Iniciales para el avatar (ej. "AB"). */
export const currentInitials = currentProfile.full_name
  .split(' ')
  .slice(0, 2)
  .map((w) => w[0])
  .join('')
  .toUpperCase();

/** El centro que gestiona el admin logueado. */
export const currentCenter: Center =
  centers.find((c) => c.id === currentProfile.center_id) ?? centers[0]!;

/* --- Donaciones e ítems ----------------------------------------------- */
/* Para el panel privado se filtran por center_id; para el gráfico público se
   agregan todos. Fechas: la mayoría "hoy" (2026-06-25) para métricas del día. */

export const donations: Donation[] = [
  { id: 'don-001', center_id: 'ctr-liceo', donor_name: 'Pedro Pérez', is_anonymous: false, created_at: '2026-06-25T08:42:00.000Z', created_by: 'prof-ana' },
  { id: 'don-002', center_id: 'ctr-liceo', donor_name: null, is_anonymous: true, created_at: '2026-06-25T09:15:00.000Z', created_by: 'prof-ana' },
  { id: 'don-003', center_id: 'ctr-liceo', donor_name: 'Familia Rodríguez', is_anonymous: false, created_at: '2026-06-25T10:05:00.000Z', created_by: 'prof-ana' },
  { id: 'don-004', center_id: 'ctr-liceo', donor_name: null, is_anonymous: true, created_at: '2026-06-25T11:30:00.000Z', created_by: 'prof-ana' },
  { id: 'don-005', center_id: 'ctr-liceo', donor_name: 'María González', is_anonymous: false, created_at: '2026-06-25T12:50:00.000Z', created_by: 'prof-ana' },
  { id: 'don-006', center_id: 'ctr-liceo', donor_name: 'Carlos Ramírez', is_anonymous: false, created_at: '2026-06-25T14:20:00.000Z', created_by: 'prof-ana' },
  { id: 'don-007', center_id: 'ctr-liceo', donor_name: 'Luisa Méndez', is_anonymous: false, created_at: '2026-06-25T15:10:00.000Z', created_by: 'prof-ana' },
  { id: 'don-008', center_id: 'ctr-liceo', donor_name: null, is_anonymous: true, created_at: '2026-06-24T16:10:00.000Z', created_by: 'prof-ana' },
  // Otros centros (alimentan el gráfico público de toda la red).
  { id: 'don-101', center_id: 'ctr-candelaria', donor_name: 'Ana Suárez', is_anonymous: false, created_at: '2026-06-25T09:00:00.000Z', created_by: 'prof-candelaria' },
  { id: 'don-102', center_id: 'ctr-polideportivo', donor_name: null, is_anonymous: true, created_at: '2026-06-25T10:40:00.000Z', created_by: 'prof-poli' },
  { id: 'don-103', center_id: 'ctr-baruta', donor_name: 'José Hernández', is_anonymous: false, created_at: '2026-06-25T13:25:00.000Z', created_by: 'prof-baruta' },
];

export const donationItems: DonationItem[] = [
  // don-001 — Pedro Pérez
  { id: 'it-001', donation_id: 'don-001', category_id: 'cat-agua', product: 'Caja de agua 24u', quantity: 72 },
  { id: 'it-002', donation_id: 'don-001', category_id: 'cat-alimentos', product: 'Atún en lata', quantity: 120 },
  // don-002 — anónimo
  { id: 'it-003', donation_id: 'don-002', category_id: 'cat-alimentos', product: 'Arroz 1kg', quantity: 100 },
  // don-003 — Familia Rodríguez
  { id: 'it-004', donation_id: 'don-003', category_id: 'cat-medicinas', product: 'Acetaminofén', quantity: 200 },
  { id: 'it-005', donation_id: 'don-003', category_id: 'cat-aseo', product: 'Jabón de baño', quantity: 150 },
  { id: 'it-006', donation_id: 'don-003', category_id: 'cat-agua', product: 'Botellón 5L', quantity: 180 },
  // don-004 — anónimo
  { id: 'it-007', donation_id: 'don-004', category_id: 'cat-alimentos', product: 'Caraotas negras 1kg', quantity: 80 },
  { id: 'it-008', donation_id: 'don-004', category_id: 'cat-panales', product: 'Pañales talla M', quantity: 95 },
  // don-005 — María González
  { id: 'it-009', donation_id: 'don-005', category_id: 'cat-ropa', product: 'Ropa de niño (lote)', quantity: 300 },
  { id: 'it-010', donation_id: 'don-005', category_id: 'cat-aseo', product: 'Toallas sanitarias', quantity: 120 },
  // don-006 — Carlos Ramírez
  { id: 'it-011', donation_id: 'don-006', category_id: 'cat-agua', product: 'Caja de agua 24u', quantity: 240 },
  { id: 'it-012', donation_id: 'don-006', category_id: 'cat-medicinas', product: 'Gasas estériles', quantity: 210 },
  // don-007 — Luisa Méndez
  { id: 'it-013', donation_id: 'don-007', category_id: 'cat-ropa', product: 'Abrigos (lote)', quantity: 230 },
  { id: 'it-014', donation_id: 'don-007', category_id: 'cat-panales', product: 'Pañales talla G', quantity: 200 },
  // don-008 — anónimo (ayer)
  { id: 'it-015', donation_id: 'don-008', category_id: 'cat-alimentos', product: 'Harina de maíz 1kg', quantity: 180 },
  // Otros centros
  { id: 'it-101', donation_id: 'don-101', category_id: 'cat-agua', product: 'Botellón 5L', quantity: 60 },
  { id: 'it-102', donation_id: 'don-101', category_id: 'cat-alimentos', product: 'Pasta 1kg', quantity: 140 },
  { id: 'it-103', donation_id: 'don-102', category_id: 'cat-alimentos', product: 'Carne enlatada', quantity: 200 },
  { id: 'it-104', donation_id: 'don-103', category_id: 'cat-medicinas', product: 'Suero fisiológico', quantity: 130 },
  { id: 'it-105', donation_id: 'don-103', category_id: 'cat-aseo', product: 'Toallas sanitarias', quantity: 90 },
];

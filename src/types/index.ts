/* ===========================================================================
   Tipos compartidos · reflejan el modelo de datos de REQUISITOS-TECNICOS.md §4
   (Supabase / PostgreSQL). Las fechas llegan como ISO string desde el SDK.
   ========================================================================== */

/** Estado operativo de un centro (enum en BD). */
export type CenterStatus = 'receiving' | 'full' | 'closed';

/** Rol del usuario administrador (enum en BD). */
export type UserRole = 'admin' | 'superadmin';

/** `centers` — centro de acopio. */
export interface Center {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  /** Contacto, opcional. */
  phone: string | null;
  /** WhatsApp en formato internacional (solo dígitos, ej. "584125550142"). Opcional. */
  whatsapp: string | null;
  /** Usuario de Instagram sin @ (ej. "cruzroja_ve"). Opcional. */
  instagram: string | null;
  /** Sitio web (URL completa). Opcional. */
  website: string | null;
  /** Correo de contacto. Opcional. */
  email: string | null;
  /** Horario de recepción legible. */
  schedule: string;
  status: CenterStatus;
  /** Solo los aprobados aparecen en la vista pública. */
  is_approved: boolean;
  /**
   * Centro/organización verificada por un coordinador autorizado (p. ej. coordinado con
   * la Cruz Roja). Muestra el sello de confianza al público (PRD §6.5).
   */
  is_verified: boolean;
  /** Organización autorizante (p. ej. Cruz Roja). */
  organization: string;
  created_at: string;
}

/** `profiles` — administrador (id = auth.users.id). */
export interface Profile {
  id: string;
  /** Centro que gestiona. */
  center_id: string;
  role: UserRole;
  full_name: string;
}

/** `categories` — catálogo controlado de insumos. */
export interface Category {
  id: string;
  /** Agua, Granos, Enlatados, Insumos Médicos, etc. */
  name: string;
  /** Unidad base: litros, unidades, kg. */
  unit: string;
}

/** `donations` — un evento de donación por donante. */
export interface Donation {
  id: string;
  center_id: string;
  /** NULL/vacío ⇒ anónimo. */
  donor_name: string | null;
  /** Derivado de `donor_name`. */
  is_anonymous: boolean;
  created_at: string;
  /** Profile que registró la donación. */
  created_by: string;
}

/** `donation_items` — productos de una donación. */
export interface DonationItem {
  id: string;
  donation_id: string;
  category_id: string;
  /** Tipo/descripción del producto (sin marca obligatoria). */
  product: string;
  quantity: number;
}

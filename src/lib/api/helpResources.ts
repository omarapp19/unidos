/* ===========================================================================
   Repositorio de recursos de ayuda humanitaria.
   Tablas: help_categories (categorías) · help_links (enlaces por categoría).
   Lectura pública; escritura restringida a superadmin via RLS.
   =========================================================================== */

import { supabase } from '@/lib/supabase';
import { fromPostgrestError } from './errors';
import { withRetry } from './retry';
import type { HelpCategory, HelpLink } from '@/types';

// ── Categorías ────────────────────────────────────────────────────────────────

/** Lista todas las categorías ordenadas por fecha de creación. */
export function getHelpCategories(): Promise<HelpCategory[]> {
  return withRetry(async () => {
    const { data, error } = await supabase
      .from('help_categories')
      .select('id, name, created_at')
      .order('created_at', { ascending: true });
    if (error) throw fromPostgrestError(error);
    return data ?? [];
  });
}

/** Crea una categoría (solo superadmin por RLS). */
export function createHelpCategory(name: string): Promise<HelpCategory> {
  return withRetry(async () => {
    const { data, error } = await supabase
      .from('help_categories')
      .insert({ name: name.trim() })
      .select('id, name, created_at')
      .single();
    if (error) throw fromPostgrestError(error);
    return data;
  });
}

/** Actualiza el nombre de una categoría (solo superadmin). */
export function updateHelpCategory(id: string, name: string): Promise<HelpCategory> {
  return withRetry(async () => {
    const { data, error } = await supabase
      .from('help_categories')
      .update({ name: name.trim() })
      .eq('id', id)
      .select('id, name, created_at')
      .single();
    if (error) throw fromPostgrestError(error);
    return data;
  });
}

/** Elimina una categoría y sus enlaces en cascada (solo superadmin). */
export function deleteHelpCategory(id: string): Promise<void> {
  return withRetry(async () => {
    const { error } = await supabase
      .from('help_categories')
      .delete()
      .eq('id', id);
    if (error) throw fromPostgrestError(error);
  });
}

/** Obtiene una categoría por ID (lectura pública). */
export function getHelpCategoryById(id: string): Promise<HelpCategory> {
  return withRetry(async () => {
    const { data, error } = await supabase
      .from('help_categories')
      .select('id, name, created_at')
      .eq('id', id)
      .single();
    if (error) throw fromPostgrestError(error);
    return data;
  });
}

// ── Enlaces ───────────────────────────────────────────────────────────────────

/** Lista los enlaces de una categoría ordenados por sort_order. */
export function getHelpLinks(categoryId: string): Promise<HelpLink[]> {
  return withRetry(async () => {
    const { data, error } = await supabase
      .from('help_links')
      .select('id, category_id, label, description, href, sort_order, created_at')
      .eq('category_id', categoryId)
      .order('sort_order', { ascending: true });
    if (error) throw fromPostgrestError(error);
    return data ?? [];
  });
}

/** Crea un enlace en una categoría (solo superadmin). */
export function createHelpLink(input: {
  category_id: string;
  label: string;
  description: string;
  href: string;
}): Promise<HelpLink> {
  return withRetry(async () => {
    const { data, error } = await supabase
      .from('help_links')
      .insert({
        category_id: input.category_id,
        label: input.label.trim(),
        description: input.description.trim(),
        href: input.href.trim(),
      })
      .select('id, category_id, label, description, href, sort_order, created_at')
      .single();
    if (error) throw fromPostgrestError(error);
    return data;
  });
}

/** Actualiza un enlace (solo superadmin). */
export function updateHelpLink(
  id: string,
  patch: { label?: string; description?: string; href?: string },
): Promise<HelpLink> {
  return withRetry(async () => {
    const clean: Record<string, string> = {};
    if (patch.label !== undefined) clean.label = patch.label.trim();
    if (patch.description !== undefined) clean.description = patch.description.trim();
    if (patch.href !== undefined) clean.href = patch.href.trim();
    const { data, error } = await supabase
      .from('help_links')
      .update(clean)
      .eq('id', id)
      .select('id, category_id, label, description, href, sort_order, created_at')
      .single();
    if (error) throw fromPostgrestError(error);
    return data;
  });
}

/** Elimina un enlace (solo superadmin). */
export function deleteHelpLink(id: string): Promise<void> {
  return withRetry(async () => {
    const { error } = await supabase
      .from('help_links')
      .delete()
      .eq('id', id);
    if (error) throw fromPostgrestError(error);
  });
}

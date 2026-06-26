import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Donation, DonationItem } from '@/types';
import {
  donations as seedDonations,
  donationItems as seedItems,
} from '@/lib/mock-data';
import type { NewDonationPayload } from '@/lib/donation-form';

/* ===========================================================================
   Store en memoria · sustituto temporal de Supabase. Mantiene donaciones e
   ítems en estado React (sembrados desde el mock) para que registrar una
   donación se refleje al instante en dashboard e historial (criterio de
   aceptación del MVP). Al integrar el backend, este provider se reemplaza por
   los hooks de datos de Supabase con la misma interfaz.
   ========================================================================== */

interface DataContextValue {
  donations: Donation[];
  donationItems: DonationItem[];
  /** Añade una donación + sus ítems al store (los antepone por recencia). */
  addDonation: (payload: NewDonationPayload) => void;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [donations, setDonations] = useState<Donation[]>(seedDonations);
  const [donationItems, setDonationItems] = useState<DonationItem[]>(seedItems);

  const addDonation = useCallback((payload: NewDonationPayload) => {
    setDonations((prev) => [payload.donation, ...prev]);
    setDonationItems((prev) => [...payload.items, ...prev]);
  }, []);

  const value = useMemo(
    () => ({ donations, donationItems, addDonation }),
    [donations, donationItems, addDonation],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData debe usarse dentro de <DataProvider>');
  return ctx;
}

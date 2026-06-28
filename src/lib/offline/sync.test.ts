import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { ApiError } from '@/lib/api/errors';

// Mock de la capa de datos: evita cargar el cliente Supabase real (que exige
// variables de entorno) y nos deja simular éxito/fallo del envío.
const createDonation = vi.fn();
vi.mock('@/lib/api/donations', () => ({
  createDonation: (args: unknown) => createDonation(args),
}));

import { __resetDBForTests } from './db';
import { enqueueDonation, countOutbox, listOutbox } from './outbox';
import { flushOutbox } from './sync';

function items() {
  return [{ category_id: 'cat-1', product: 'Agua', quantity: 5 }];
}

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  __resetDBForTests();
  createDonation.mockReset();
});

describe('flushOutbox', () => {
  it('envía toda la cola y la vacía cuando hay conexión', async () => {
    createDonation.mockResolvedValue('donation-id');
    await enqueueDonation({ centerId: 'c1', donorName: '', items: items() });
    await enqueueDonation({ centerId: 'c1', donorName: 'Ana', items: items() });

    const res = await flushOutbox();

    expect(res.sent).toBe(2);
    expect(res.remaining).toBe(0);
    expect(await countOutbox()).toBe(0);
  });

  it('reenvía con el mismo clientUuid (idempotencia)', async () => {
    createDonation.mockResolvedValue('donation-id');
    const entry = await enqueueDonation({ centerId: 'c1', donorName: '', items: items() });

    await flushOutbox();

    expect(createDonation).toHaveBeenCalledWith(
      expect.objectContaining({ clientUuid: entry.clientUuid }),
    );
  });

  it('detiene el flush ante un error de red y conserva la cola', async () => {
    createDonation.mockRejectedValue(new ApiError('sin red', { retryable: true }));
    await enqueueDonation({ centerId: 'c1', donorName: '', items: items() });
    await enqueueDonation({ centerId: 'c1', donorName: '', items: items() });

    const res = await flushOutbox();

    expect(res.sent).toBe(0);
    expect(res.stoppedByNetwork).toBe(true);
    expect(res.remaining).toBe(2);
    // Solo intentó la primera antes de cortar.
    expect(createDonation).toHaveBeenCalledTimes(1);
    const [first] = await listOutbox();
    expect(first!.status).toBe('error');
  });

  it('ante error definitivo marca la entrada y sigue con la siguiente', async () => {
    createDonation
      .mockRejectedValueOnce(new ApiError('inválido', { retryable: false }))
      .mockResolvedValueOnce('donation-id');
    await enqueueDonation({ centerId: 'c1', donorName: 'malo', items: items() });
    await new Promise((r) => setTimeout(r, 2));
    await enqueueDonation({ centerId: 'c1', donorName: 'bueno', items: items() });

    const res = await flushOutbox();

    expect(res.sent).toBe(1);
    expect(res.remaining).toBe(1);
    expect(createDonation).toHaveBeenCalledTimes(2);
  });
});

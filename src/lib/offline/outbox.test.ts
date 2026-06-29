import { describe, it, expect, beforeEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { __resetDBForTests } from './db';
import {
  enqueueDonation,
  listOutbox,
  countOutbox,
  removeFromOutbox,
  markEntryError,
} from './outbox';

function sampleItems() {
  return [{ category_id: 'cat-1', product: 'Agua', quantity: 10 }];
}

beforeEach(() => {
  // BD limpia por test.
  globalThis.indexedDB = new IDBFactory();
  __resetDBForTests();
});

describe('outbox', () => {
  it('encola una donación con clientUuid y estado pending', async () => {
    const entry = await enqueueDonation({
      centerId: 'c1',
      donorName: 'Ana',
      items: sampleItems(),
    });
    expect(entry.clientUuid).toMatch(/[0-9a-f-]{36}/);
    expect(entry.status).toBe('pending');
    expect(entry.attempts).toBe(0);
    expect(await countOutbox()).toBe(1);
  });

  it('lista en orden FIFO (más antigua primero)', async () => {
    const a = await enqueueDonation({ centerId: 'c1', donorName: '', items: sampleItems() });
    await new Promise((r) => setTimeout(r, 2));
    const b = await enqueueDonation({ centerId: 'c1', donorName: '', items: sampleItems() });
    const list = await listOutbox();
    expect(list.map((e) => e.clientUuid)).toEqual([a.clientUuid, b.clientUuid]);
  });

  it('borra una entrada de la cola', async () => {
    const e = await enqueueDonation({ centerId: 'c1', donorName: '', items: sampleItems() });
    await removeFromOutbox(e.clientUuid);
    expect(await countOutbox()).toBe(0);
  });

  it('marca error y suma intento sin sacarla de la cola', async () => {
    const e = await enqueueDonation({ centerId: 'c1', donorName: '', items: sampleItems() });
    await markEntryError(e.clientUuid, 'sin red');
    const [updated] = await listOutbox();
    expect(updated!.status).toBe('error');
    expect(updated!.attempts).toBe(1);
    expect(updated!.lastError).toBe('sin red');
    expect(await countOutbox()).toBe(1);
  });
});

/**
 * Shim for @nozbe/watermelondb/react and @nozbe/watermelondb.
 *
 * Screens that cannot be modified still call useDatabase() and use
 * a database-like object to run queries. This shim provides a fake
 * database that delegates to the REST API so those screens keep working.
 *
 * The fake DB object exposes:
 *   db.get(table).find(id)
 *   db.get(table).query(...).fetch()
 *   db.get(table).query(...).observe().subscribe(cb) → returns { unsubscribe }
 *   db.get(table).query(...).observeWithColumns(...).subscribe(cb) → same
 *
 * All queries poll via setInterval to mimic observable behavior.
 */

import { api } from '../api/client';
import { toTask, toGoal } from '../api/mappers';

// ─── Table → fetch function mapping ────────────────────────────────────────────

const TABLE_FETCHERS: Record<string, () => Promise<any[]>> = {
  tasks: () => api.get<any[]>('/tasks').then((rows) => rows.map(toTask)),
  goals: () => api.get<any[]>('/goals').then((rows) => rows.map(toGoal)),
};

// ─── Fake Query builder ────────────────────────────────────────────────────────

class FakeQuery {
  private table: string;
  // conditions and sorts are ignored — we filter/sort client-side based on what the screen does
  constructor(table: string) {
    this.table = table;
  }

  async fetch(): Promise<any[]> {
    const fetcher = TABLE_FETCHERS[this.table];
    if (!fetcher) return [];
    return fetcher();
  }

  observe() {
    return {
      subscribe: (cb: (items: any[]) => void) => {
        const fetcher = TABLE_FETCHERS[this.table];
        if (!fetcher) {
          cb([]);
          return { unsubscribe: () => {} };
        }
        const run = () => fetcher().then(cb).catch(console.error);
        run();
        const id = setInterval(run, 2000);
        return { unsubscribe: () => clearInterval(id) };
      },
    };
  }

  observeWithColumns(_columns: string[]) {
    return this.observe();
  }
}

// ─── Fake table collection ─────────────────────────────────────────────────────

class FakeCollection {
  private table: string;
  constructor(table: string) {
    this.table = table;
  }

  async find(id: string): Promise<any> {
    const fetcher = TABLE_FETCHERS[this.table];
    if (!fetcher) throw new Error(`No fetcher for table: ${this.table}`);
    const items = await fetcher();
    const found = items.find((item: any) => item.id === id);
    if (!found) throw new Error(`Record not found: ${this.table}/${id}`);
    return found;
  }

  query(..._conditions: any[]): FakeQuery {
    return new FakeQuery(this.table);
  }
}

// ─── Fake database ─────────────────────────────────────────────────────────────

const fakeDatabase = {
  get<T = any>(_table: string): FakeCollection {
    return new FakeCollection(_table);
  },
};

// ─── useDatabase hook ──────────────────────────────────────────────────────────

export function useDatabase() {
  return fakeDatabase;
}

// ─── Q stub (queries are handled client-side) ──────────────────────────────────

export const Q = {
  where: (..._args: any[]) => ({}),
  and: (..._args: any[]) => ({}),
  or: (..._args: any[]) => ({}),
  sortBy: (_col: string, _dir?: any) => ({}),
  asc: 'asc' as const,
  desc: 'desc' as const,
  gte: (v: any) => v,
  lte: (v: any) => v,
  gt: (v: any) => v,
  lt: (v: any) => v,
  eq: (v: any) => v,
  notEq: (v: any) => v,
  oneOf: (vals: any[]) => vals,
  notIn: (vals: any[]) => vals,
  like: (v: string) => v,
  notLike: (v: string) => v,
  between: (a: any, b: any) => [a, b],
};

import type { Brand, Draft } from './types';
import { isDesktop } from './desktop';

const KEY = 'papersignal-web-state';

interface LocalState { drafts: Draft[]; brand: Brand; }
const defaultBrand: Brand = { name: 'LayoutGo', accent: '#3152A2', font: 'serif' };

function readWeb(): LocalState {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) as LocalState : { drafts: [], brand: defaultBrand };
  } catch { return { drafts: [], brand: defaultBrand }; }
}

function writeWeb(next: LocalState) { localStorage.setItem(KEY, JSON.stringify(next)); }

async function db() {
  const { default: Database } = await import('@tauri-apps/plugin-sql');
  const database = await Database.load('sqlite:papersignal.db');
  await database.execute('CREATE TABLE IF NOT EXISTS drafts (id TEXT PRIMARY KEY, title TEXT NOT NULL, template TEXT NOT NULL, content TEXT NOT NULL, updated_at TEXT NOT NULL)');
  await database.execute('CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
  return database;
}

export async function loadDrafts(): Promise<Draft[]> {
  if (!isDesktop()) return readWeb().drafts;
  const database = await db();
  const rows = await database.select<Array<{ id: string; title: string; template: Draft['template']; content: string; updated_at: string }>>('SELECT id, title, template, content, updated_at FROM drafts ORDER BY updated_at DESC');
  return rows.map((row) => ({ id: row.id, title: row.title, template: row.template, content: row.content, updatedAt: row.updated_at }));
}

export async function saveDraft(draft: Draft): Promise<void> {
  if (!isDesktop()) {
    const state = readWeb();
    writeWeb({ ...state, drafts: [draft, ...state.drafts.filter((item) => item.id !== draft.id)] });
    return;
  }
  const database = await db();
  await database.execute('INSERT INTO drafts (id, title, template, content, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET title = excluded.title, template = excluded.template, content = excluded.content, updated_at = excluded.updated_at', [draft.id, draft.title, draft.template, draft.content, draft.updatedAt]);
}

export async function deleteDraft(id: string): Promise<void> {
  if (!isDesktop()) { const state = readWeb(); writeWeb({ ...state, drafts: state.drafts.filter((item) => item.id !== id) }); return; }
  const database = await db();
  await database.execute('DELETE FROM drafts WHERE id = ?', [id]);
}

export async function loadBrand(): Promise<Brand> {
  if (!isDesktop()) return readWeb().brand;
  const database = await db();
  const rows = await database.select<Array<{ value: string }>>('SELECT value FROM settings WHERE key = ?', ['brand']);
  return rows[0] ? JSON.parse(rows[0].value) as Brand : defaultBrand;
}

export async function saveBrand(brand: Brand): Promise<void> {
  if (!isDesktop()) { const state = readWeb(); writeWeb({ ...state, brand }); return; }
  const database = await db();
  await database.execute('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', ['brand', JSON.stringify(brand)]);
}

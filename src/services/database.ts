import Database from 'better-sqlite3';
import path from 'path';
import type { WatchTarget, PageSnapshot, ChangeRecord, MonitorStats } from '@/types';

const DATA_DIR = process.env.DATA_DIR || './data';
const DB_PATH = path.join(DATA_DIR, 'webwatcher.db');

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    // Ensure data directory exists
    const fs = require('fs');
    fs.mkdirSync(DATA_DIR, { recursive: true });

    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS targets (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      name TEXT NOT NULL,
      selector TEXT,
      check_interval TEXT NOT NULL DEFAULT '1hour',
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      last_checked_at TEXT,
      last_changed_at TEXT,
      notify_email TEXT,
      notify_webhook TEXT,
      notify_telegram TEXT,
      notify_discord TEXT
    );

    CREATE TABLE IF NOT EXISTS snapshots (
      id TEXT PRIMARY KEY,
      target_id TEXT NOT NULL,
      content TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      captured_at TEXT NOT NULL,
      title TEXT,
      status_code INTEGER NOT NULL,
      response_time INTEGER NOT NULL,
      FOREIGN KEY (target_id) REFERENCES targets(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS changes (
      id TEXT PRIMARY KEY,
      target_id TEXT NOT NULL,
      previous_snapshot_id TEXT NOT NULL,
      current_snapshot_id TEXT NOT NULL,
      detected_at TEXT NOT NULL,
      change_type TEXT NOT NULL DEFAULT 'content',
      change_summary TEXT,
      diff_html TEXT,
      importance TEXT NOT NULL DEFAULT 'low',
      notified INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (target_id) REFERENCES targets(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_snapshots_target ON snapshots(target_id);
    CREATE INDEX IF NOT EXISTS idx_snapshots_captured ON snapshots(captured_at DESC);
    CREATE INDEX IF NOT EXISTS idx_changes_target ON changes(target_id);
    CREATE INDEX IF NOT EXISTS idx_changes_detected ON changes(detected_at DESC);
  `);
}

// ============== Conversion helpers ==============

function rowToTarget(row: any): WatchTarget {
  return {
    id: row.id,
    url: row.url,
    name: row.name,
    selector: row.selector || undefined,
    checkInterval: row.check_interval,
    enabled: !!row.enabled,
    createdAt: row.created_at,
    lastCheckedAt: row.last_checked_at || undefined,
    lastChangedAt: row.last_changed_at || undefined,
    notifyEmail: row.notify_email || undefined,
    notifyWebhook: row.notify_webhook || undefined,
    notifyTelegram: row.notify_telegram || undefined,
    notifyDiscord: row.notify_discord || undefined,
  };
}

function rowToSnapshot(row: any): PageSnapshot {
  return {
    id: row.id,
    targetId: row.target_id,
    content: row.content,
    contentHash: row.content_hash,
    capturedAt: row.captured_at,
    metadata: {
      title: row.title || undefined,
      statusCode: row.status_code,
      responseTime: row.response_time,
    },
  };
}

function rowToChange(row: any): ChangeRecord {
  return {
    id: row.id,
    targetId: row.target_id,
    previousSnapshotId: row.previous_snapshot_id,
    currentSnapshotId: row.current_snapshot_id,
    detectedAt: row.detected_at,
    changeType: row.change_type,
    changeSummary: row.change_summary || undefined,
    diffHtml: row.diff_html || undefined,
    importance: row.importance,
    notified: !!row.notified,
  };
}

// ============== Targets ==============

export function getTargets(): WatchTarget[] {
  return getDb().prepare('SELECT * FROM targets ORDER BY created_at DESC').all().map(rowToTarget);
}

export function getTarget(id: string): WatchTarget | null {
  const row = getDb().prepare('SELECT * FROM targets WHERE id = ?').get(id);
  return row ? rowToTarget(row) : null;
}

export function addTarget(target: WatchTarget): void {
  getDb().prepare(`
    INSERT INTO targets (id, url, name, selector, check_interval, enabled, created_at, notify_email, notify_webhook, notify_telegram, notify_discord)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    target.id, target.url, target.name, target.selector || null,
    target.checkInterval, target.enabled ? 1 : 0, target.createdAt,
    target.notifyEmail || null, target.notifyWebhook || null,
    target.notifyTelegram || null, target.notifyDiscord || null,
  );
}

export function updateTarget(id: string, updates: Partial<WatchTarget>): WatchTarget | null {
  const existing = getTarget(id);
  if (!existing) return null;

  const merged = { ...existing, ...updates };
  getDb().prepare(`
    UPDATE targets SET
      url = ?, name = ?, selector = ?, check_interval = ?, enabled = ?,
      last_checked_at = ?, last_changed_at = ?,
      notify_email = ?, notify_webhook = ?, notify_telegram = ?, notify_discord = ?
    WHERE id = ?
  `).run(
    merged.url, merged.name, merged.selector || null, merged.checkInterval,
    merged.enabled ? 1 : 0, merged.lastCheckedAt || null, merged.lastChangedAt || null,
    merged.notifyEmail || null, merged.notifyWebhook || null,
    merged.notifyTelegram || null, merged.notifyDiscord || null,
    id,
  );
  return getTarget(id);
}

export function deleteTarget(id: string): boolean {
  const result = getDb().prepare('DELETE FROM targets WHERE id = ?').run(id);
  return result.changes > 0;
}

// ============== Snapshots ==============

export function saveSnapshot(snapshot: PageSnapshot): void {
  getDb().prepare(`
    INSERT INTO snapshots (id, target_id, content, content_hash, captured_at, title, status_code, response_time)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    snapshot.id, snapshot.targetId, snapshot.content, snapshot.contentHash,
    snapshot.capturedAt, snapshot.metadata.title || null,
    snapshot.metadata.statusCode, snapshot.metadata.responseTime,
  );
}

export function getSnapshot(id: string): PageSnapshot | null {
  const row = getDb().prepare('SELECT * FROM snapshots WHERE id = ?').get(id);
  return row ? rowToSnapshot(row) : null;
}

export function getLatestSnapshot(targetId: string): PageSnapshot | null {
  const row = getDb().prepare(
    'SELECT * FROM snapshots WHERE target_id = ? ORDER BY captured_at DESC LIMIT 1'
  ).get(targetId);
  return row ? rowToSnapshot(row) : null;
}

export function getSnapshotsForTarget(targetId: string, limit: number = 20): PageSnapshot[] {
  return getDb().prepare(
    'SELECT * FROM snapshots WHERE target_id = ? ORDER BY captured_at DESC LIMIT ?'
  ).all(targetId, limit).map(rowToSnapshot);
}

// ============== Changes ==============

export function saveChange(change: ChangeRecord): void {
  getDb().prepare(`
    INSERT INTO changes (id, target_id, previous_snapshot_id, current_snapshot_id, detected_at, change_type, change_summary, diff_html, importance, notified)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    change.id, change.targetId, change.previousSnapshotId, change.currentSnapshotId,
    change.detectedAt, change.changeType, change.changeSummary || null,
    change.diffHtml || null, change.importance, change.notified ? 1 : 0,
  );
}

export function getRecentChanges(limit: number = 50): ChangeRecord[] {
  return getDb().prepare(
    'SELECT * FROM changes ORDER BY detected_at DESC LIMIT ?'
  ).all(limit).map(rowToChange);
}

export function getChange(id: string): ChangeRecord | null {
  const row = getDb().prepare('SELECT * FROM changes WHERE id = ?').get(id);
  return row ? rowToChange(row) : null;
}

export function getChangesForTarget(targetId: string, limit: number = 20): ChangeRecord[] {
  return getDb().prepare(
    'SELECT * FROM changes WHERE target_id = ? ORDER BY detected_at DESC LIMIT ?'
  ).all(targetId, limit).map(rowToChange);
}

// ============== Stats ==============

export function getStats(): MonitorStats {
  const d = getDb();
  const totalTargets = (d.prepare('SELECT COUNT(*) as c FROM targets').get() as any).c;
  const activeTargets = (d.prepare('SELECT COUNT(*) as c FROM targets WHERE enabled = 1').get() as any).c;
  const totalChanges = (d.prepare('SELECT COUNT(*) as c FROM changes').get() as any).c;

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const changesLast24h = (d.prepare('SELECT COUNT(*) as c FROM changes WHERE detected_at > ?').get(oneDayAgo) as any).c;

  const lastRow = d.prepare('SELECT last_checked_at FROM targets WHERE last_checked_at IS NOT NULL ORDER BY last_checked_at DESC LIMIT 1').get() as any;

  return {
    totalTargets,
    activeTargets,
    totalChanges,
    changesLast24h,
    lastCheckTime: lastRow?.last_checked_at,
  };
}

// ============== Migration from JSON ==============

export async function migrateFromJson(): Promise<{ migrated: boolean; targets: number; snapshots: number; changes: number }> {
  const fs = require('fs').promises;
  const result = { migrated: false, targets: 0, snapshots: 0, changes: 0 };

  try {
    const targetsPath = path.join(DATA_DIR, 'targets.json');
    const data = await fs.readFile(targetsPath, 'utf-8');
    const targets: WatchTarget[] = JSON.parse(data);

    if (targets.length === 0) return result;

    const d = getDb();
    const existingCount = (d.prepare('SELECT COUNT(*) as c FROM targets').get() as any).c;
    if (existingCount > 0) return result; // Already has data

    // Migrate targets
    for (const t of targets) {
      addTarget(t);
      result.targets++;
    }

    // Migrate snapshots
    try {
      const snapshotsDir = path.join(DATA_DIR, 'snapshots');
      const files = await fs.readdir(snapshotsDir);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const snap = JSON.parse(await fs.readFile(path.join(snapshotsDir, file), 'utf-8'));
        saveSnapshot(snap);
        result.snapshots++;
      }
    } catch { /* no snapshots dir */ }

    // Migrate changes
    try {
      const changesDir = path.join(DATA_DIR, 'changes');
      const files = await fs.readdir(changesDir);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const change = JSON.parse(await fs.readFile(path.join(changesDir, file), 'utf-8'));
        saveChange(change);
        result.changes++;
      }
    } catch { /* no changes dir */ }

    result.migrated = true;
    return result;
  } catch {
    return result;
  }
}

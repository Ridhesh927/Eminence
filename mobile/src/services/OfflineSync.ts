import * as SQLite from 'expo-sqlite';
import NetInfo from '@react-native-community/netinfo';
import api from './api';

const db = SQLite.openDatabaseSync('eminence_offline.db');

export const MAX_OFFLINE_RETRIES = 5;

export const initOfflineDB = () => {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS pending_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT,
      method TEXT,
      payload TEXT,
      retry_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Safe schema migrations for existing installs
  try {
    db.execSync('ALTER TABLE pending_requests ADD COLUMN retry_count INTEGER DEFAULT 0;');
  } catch (_) {}
  try {
    db.execSync('ALTER TABLE pending_requests ADD COLUMN status TEXT DEFAULT "pending";');
  } catch (_) {}
};

export const queueOfflineRequest = (url: string, method: string, payload: any) => {
  db.runSync(
    "INSERT INTO pending_requests (url, method, payload, retry_count, status) VALUES (?, ?, ?, 0, 'pending')",
    url,
    method,
    JSON.stringify(payload)
  );
  console.log(`[Offline Sync] Queued ${method} ${url} to local SQLite queue`);
};

export const syncOfflineQueue = async () => {
  const state = await NetInfo.fetch();
  if (!state.isConnected) return;

  // Auto-expire requests older than 24 hours to avoid replaying stale actions
  try {
    db.runSync(
      "UPDATE pending_requests SET status = 'expired' WHERE status = 'pending' AND datetime(created_at) < datetime('now', '-1 day')"
    );
  } catch (err) {
    console.warn('[Offline Sync] Failed to run expiry cleanup:', err);
  }

  const rows = (db.getAllSync(
    `SELECT id, url, method, payload, retry_count FROM pending_requests WHERE status = 'pending' AND retry_count < ${MAX_OFFLINE_RETRIES} ORDER BY id ASC`
  ) as Array<{
    id: number;
    url: string;
    method: string;
    payload: string;
    retry_count: number;
  }>);
  
  if (rows.length === 0) return;

  console.log(`[Offline Sync] Network restored. Syncing ${rows.length} pending items...`);

  for (const row of rows) {
    try {
      if (row.method === 'POST') {
        await api.post(row.url, JSON.parse(row.payload));
      } else if (row.method === 'PATCH') {
        await api.patch(row.url, JSON.parse(row.payload));
      } else if (row.method === 'PUT') {
        await api.put(row.url, JSON.parse(row.payload));
      }
      
      // Success, remove from queue
      db.runSync('DELETE FROM pending_requests WHERE id = ?', row.id);
      console.log(`[Offline Sync] Successfully synced ID ${row.id}`);
    } catch (err: any) {
      const currentRetries = (row.retry_count || 0) + 1;
      const isClientError = err.response && err.response.status >= 400 && err.response.status < 500;

      if (currentRetries >= MAX_OFFLINE_RETRIES || isClientError) {
        // Exceeded retries or non-retriable client error: move to 'failed' state
        db.runSync(
          "UPDATE pending_requests SET status = 'failed', retry_count = ? WHERE id = ?",
          currentRetries,
          row.id
        );
        console.warn(
          `[Offline Sync] Request ID ${row.id} moved to 'failed' state after ${currentRetries} attempts (status: ${err.response?.status || 'unknown'})`
        );
      } else {
        db.runSync(
          'UPDATE pending_requests SET retry_count = ? WHERE id = ?',
          currentRetries,
          row.id
        );
        console.warn(`[Offline Sync] Failed to sync ID ${row.id} (attempt ${currentRetries}/${MAX_OFFLINE_RETRIES}), pausing queue`);
        // Stop syncing remaining items to maintain FIFO ordering for transient network issues
        break;
      }
    }
  }
};

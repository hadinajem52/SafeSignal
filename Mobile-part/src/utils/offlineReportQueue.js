import AsyncStorage from '@react-native-async-storage/async-storage';
import { incidentAPI } from '../services/api';
import logger from './logger';

const STORAGE_KEY = 'safesignal_offline_reports';

async function readQueue() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function writeQueue(items) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export async function enqueueReport(incidentData) {
  const items = await readQueue();
  items.push({
    id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    data: incidentData,
    queuedAt: new Date().toISOString(),
  });
  await writeQueue(items);
  return items.length;
}

export async function getQueuedCount() {
  return (await readQueue()).length;
}

let flushing = false;

const PERMANENT_DROP_STATUSES = new Set([400, 404, 409, 413, 422]);

export async function flushReportQueue() {
  if (flushing) {
    return { sent: 0, dropped: 0, remaining: await getQueuedCount() };
  }
  flushing = true;
  try {
    const items = await readQueue();
    if (items.length === 0) {
      return { sent: 0, dropped: 0, remaining: 0 };
    }

    let sent = 0;
    let dropped = 0;
    let index = 0;
    let stopped = false;

    for (; index < items.length; index += 1) {
      const result = await incidentAPI.submitIncident(items[index].data);
      if (result.success) {
        sent += 1;
        continue;
      }
      if (!result.networkError && PERMANENT_DROP_STATUSES.has(result.status)) {
        dropped += 1;
        logger.warn(`Dropping permanently-rejected queued report (status ${result.status}): ${result.error || ''}`);
        continue;
      }
      stopped = true;
      break;
    }

    const remainingItems = stopped ? items.slice(index) : [];
    await writeQueue(remainingItems);
    return { sent, dropped, remaining: remainingItems.length };
  } finally {
    flushing = false;
  }
}

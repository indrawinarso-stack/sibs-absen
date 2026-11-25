import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  Unsubscribe,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  AttendanceLog,
  DEFAULT_EMPLOYEES,
  DEFAULT_GRACE_MINUTES,
  DEFAULT_STORE_NAME,
  EmployeeItem,
  StoreSettings,
} from '../types/attendance';
import { getCachedPinHash, getDefaultPinHash } from '../utils/adminAuth';
import {
  loadAttendanceLogs as loadLocalLogs,
  loadEmployees as loadLocalEmployees,
} from '../utils/attendance';

const EMPLOYEES_COLLECTION = 'employees';
const LOGS_COLLECTION = 'attendance_logs';
const SETTINGS_COLLECTION = 'settings';
const STORE_SETTINGS_DOC_ID = 'store';

function toSafeEmployeeId(name: string, suffix?: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24);
  const base = slug || 'karyawan';
  return suffix ? `emp_${base}_${suffix}` : `emp_${base}`;
}

function toSafeLogId(rawId?: string): string {
  if (rawId && /^[a-zA-Z0-9_-]{1,128}$/.test(rawId)) {
    return rawId;
  }
  const rand = Math.random().toString(36).slice(2, 8);
  return `log_${Date.now()}_${rand}`;
}

function timestampToMs(value: unknown, fallback: number = Date.now()): number {
  if (value instanceof Timestamp) {
    return value.toMillis();
  }
  if (typeof value === 'number') {
    return value;
  }
  return fallback;
}

export async function initializeCloudStoreIfNeeded(): Promise<void> {
  const settingsPath = `${SETTINGS_COLLECTION}/${STORE_SETTINGS_DOC_ID}`;
  try {
    const settingsRef = doc(db, SETTINGS_COLLECTION, STORE_SETTINGS_DOC_ID);
    const snapshot = await getDoc(settingsRef);

    if (snapshot.exists()) {
      return;
    }

    const initialPinHash =
      getCachedPinHash() || (await getDefaultPinHash());
    const batch = writeBatch(db);

    batch.set(settingsRef, {
      storeName: DEFAULT_STORE_NAME,
      adminPinHash: initialPinHash,
      graceMinutes: DEFAULT_GRACE_MINUTES,
      updatedAt: serverTimestamp(),
    });

    // Seed initial employees (migrate from localStorage if present, else Risa & Zulfa)
    const localEmployees = loadLocalEmployees();
    const seedEmployees =
      localEmployees.length > 0 ? localEmployees : DEFAULT_EMPLOYEES;
    seedEmployees.forEach((empName, index) => {
      const cleaned = empName.trim().slice(0, 40);
      if (!cleaned) return;
      const empId = toSafeEmployeeId(cleaned, String(index + 1));
      batch.set(doc(db, EMPLOYEES_COLLECTION, empId), {
        name: cleaned,
        createdAt: serverTimestamp(),
      });
    });

    // Migrate any pre-existing localStorage logs on first cloud initialization
    const localLogs = loadLocalLogs();
    localLogs.slice(0, 200).forEach((log) => {
      const cleanedName = (log.employeeName || '').trim().slice(0, 40);
      if (!cleanedName || !/^\d{4}-\d{2}-\d{2}$/.test(log.date || '')) return;
      const safeShift =
        log.shift === 'pagi' || log.shift === 'siang' || log.shift === 'seharian'
          ? log.shift
          : 'pagi';
      const safeStatus =
        log.status === 'Tepat Waktu' ||
        log.status === 'Terlambat' ||
        log.status === 'Ijin' ||
        log.status === 'Libur'
          ? log.status
          : 'Tepat Waktu';
      const safeIn =
        typeof log.checkInTime === 'string' &&
        /^\d{2}:\d{2}$/.test(log.checkInTime)
          ? log.checkInTime
          : '';
      const safeOut =
        typeof log.checkOutTime === 'string' &&
        /^\d{2}:\d{2}$/.test(log.checkOutTime)
          ? log.checkOutTime
          : '';
      const logId = toSafeLogId(log.id);
      batch.set(doc(db, LOGS_COLLECTION, logId), {
        date: log.date.slice(0, 10),
        employeeName: cleanedName,
        shift: safeShift,
        checkInTime: safeIn,
        checkOutTime: safeOut,
        status: safeStatus,
        lateMinutes: Math.max(0, Math.min(1440, Math.round(log.lateMinutes || 0))),
        note: (log.note || '').trim().slice(0, 160),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, settingsPath);
  }
}

export function subscribeEmployees(
  onData: (items: EmployeeItem[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const employeesQuery = query(
    collection(db, EMPLOYEES_COLLECTION),
    where('name', '>=', ''),
    limit(200)
  );
  return onSnapshot(
    employeesQuery,
    (snapshot) => {
      const items: EmployeeItem[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: typeof data.name === 'string' ? data.name : '',
          createdAt: timestampToMs(data.createdAt, 0),
        };
      });
      items.sort((a, b) => {
        if (a.createdAt !== b.createdAt) {
          return a.createdAt - b.createdAt;
        }
        return a.name.localeCompare(b.name, 'id');
      });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, EMPLOYEES_COLLECTION);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export function subscribeAttendanceLogs(
  onData: (logs: AttendanceLog[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const logsQuery = query(
    collection(db, LOGS_COLLECTION),
    where('date', '>=', '2000-01-01'),
    orderBy('date', 'desc'),
    limit(2000)
  );
  return onSnapshot(
    logsQuery,
    (snapshot) => {
      const items: AttendanceLog[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        const rawIn = typeof data.checkInTime === 'string' ? data.checkInTime : '';
        const rawOut =
          typeof data.checkOutTime === 'string' ? data.checkOutTime : '';
        return {
          id: docSnap.id,
          date: typeof data.date === 'string' ? data.date : '',
          employeeName:
            typeof data.employeeName === 'string' ? data.employeeName : '',
          shift:
            data.shift === 'pagi' ||
            data.shift === 'siang' ||
            data.shift === 'seharian'
              ? data.shift
              : 'pagi',
          checkInTime: rawIn || null,
          checkOutTime: rawOut || null,
          status:
            data.status === 'Tepat Waktu' ||
            data.status === 'Terlambat' ||
            data.status === 'Ijin' ||
            data.status === 'Libur'
              ? data.status
              : 'Tepat Waktu',
          lateMinutes:
            typeof data.lateMinutes === 'number' ? data.lateMinutes : 0,
          note: typeof data.note === 'string' ? data.note : '',
          createdAt: timestampToMs(data.createdAt, 0),
        };
      });
      items.sort((a, b) => {
        if (a.date !== b.date) {
          return b.date.localeCompare(a.date);
        }
        return b.createdAt - a.createdAt;
      });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, LOGS_COLLECTION);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export function subscribeStoreSettings(
  onData: (settings: StoreSettings | null) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const path = `${SETTINGS_COLLECTION}/${STORE_SETTINGS_DOC_ID}`;
  return onSnapshot(
    doc(db, SETTINGS_COLLECTION, STORE_SETTINGS_DOC_ID),
    (docSnap) => {
      if (!docSnap.exists()) {
        onData(null);
        return;
      }
      const data = docSnap.data();
      onData({
        storeName:
          typeof data.storeName === 'string'
            ? data.storeName
            : DEFAULT_STORE_NAME,
        adminPinHash:
          typeof data.adminPinHash === 'string' ? data.adminPinHash : '',
        graceMinutes:
          typeof data.graceMinutes === 'number'
            ? data.graceMinutes
            : DEFAULT_GRACE_MINUTES,
      });
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export async function createEmployeeDoc(name: string): Promise<void> {
  const cleaned = name.trim().slice(0, 40);
  const rand = Math.random().toString(36).slice(2, 6);
  const id = toSafeEmployeeId(cleaned, `${Date.now()}_${rand}`);
  const path = `${EMPLOYEES_COLLECTION}/${id}`;
  try {
    await setDoc(doc(db, EMPLOYEES_COLLECTION, id), {
      name: cleaned,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteEmployeeDoc(id: string): Promise<void> {
  const path = `${EMPLOYEES_COLLECTION}/${id}`;
  try {
    await deleteDoc(doc(db, EMPLOYEES_COLLECTION, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function createAttendanceLogDoc(
  record: Omit<AttendanceLog, 'id' | 'createdAt'>
): Promise<string> {
  const id = toSafeLogId();
  const path = `${LOGS_COLLECTION}/${id}`;
  try {
    await setDoc(doc(db, LOGS_COLLECTION, id), {
      date: record.date.slice(0, 10),
      employeeName: record.employeeName.trim().slice(0, 40),
      shift: record.shift,
      checkInTime: record.checkInTime ?? '',
      checkOutTime: record.checkOutTime ?? '',
      status: record.status,
      lateMinutes: Math.max(0, Math.min(1440, Math.round(record.lateMinutes))),
      note: record.note.trim().slice(0, 160),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function checkOutAttendanceLogDoc(
  logId: string,
  checkOutTime: string,
  note: string
): Promise<void> {
  const path = `${LOGS_COLLECTION}/${logId}`;
  try {
    await updateDoc(doc(db, LOGS_COLLECTION, logId), {
      checkOutTime: checkOutTime.slice(0, 5),
      note: note.trim().slice(0, 160),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteAttendanceLogDoc(logId: string): Promise<void> {
  const path = `${LOGS_COLLECTION}/${logId}`;
  try {
    await deleteDoc(doc(db, LOGS_COLLECTION, logId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function updateStoreSettingsDoc(
  settings: StoreSettings
): Promise<void> {
  const path = `${SETTINGS_COLLECTION}/${STORE_SETTINGS_DOC_ID}`;
  try {
    await updateDoc(doc(db, SETTINGS_COLLECTION, STORE_SETTINGS_DOC_ID), {
      storeName: settings.storeName.trim().slice(0, 60) || DEFAULT_STORE_NAME,
      adminPinHash: settings.adminPinHash,
      graceMinutes: Math.max(
        0,
        Math.min(120, Math.round(settings.graceMinutes))
      ),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

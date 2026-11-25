/**
 * Security Rules Verification Spec for SIBS-Mart Firestore
 * Validates the 12 Dirty Dozen payloads documented in security_spec.md against firestore.rules constraints.
 */
export interface RuleTestCase {
  name: string;
  collection: 'employees' | 'attendance_logs' | 'settings' | 'admins';
  docId: string;
  operation: 'create' | 'update' | 'read';
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_CASES: RuleTestCase[] = [
  {
    name: '1. Ghost field on Employee create',
    collection: 'employees',
    docId: 'emp_risa',
    operation: 'create',
    payload: { name: 'Risa', createdAt: 'SERVER_TIME', isAdmin: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '2. Oversized Employee name (> 40 chars)',
    collection: 'employees',
    docId: 'emp_long',
    operation: 'create',
    payload: { name: 'A'.repeat(41), createdAt: 'SERVER_TIME' },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '3. Invalid document ID poisoning',
    collection: 'employees',
    docId: 'invalid id with spaces!',
    operation: 'create',
    payload: { name: 'Risa', createdAt: 'SERVER_TIME' },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '4. Fake client timestamp on AttendanceLog create',
    collection: 'attendance_logs',
    docId: 'log_001',
    operation: 'create',
    payload: {
      date: '2026-11-25',
      employeeName: 'Risa',
      shift: 'pagi',
      checkInTime: '09:00',
      checkOutTime: '',
      status: 'Tepat Waktu',
      lateMinutes: 0,
      note: '',
      createdAt: '2020-01-01T00:00:00Z',
      updatedAt: 'SERVER_TIME',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '5. Invalid Status enum on AttendanceLog',
    collection: 'attendance_logs',
    docId: 'log_002',
    operation: 'create',
    payload: {
      date: '2026-11-25',
      employeeName: 'Risa',
      shift: 'pagi',
      checkInTime: '09:00',
      checkOutTime: '',
      status: 'AdminOverride',
      lateMinutes: 0,
      note: '',
      createdAt: 'SERVER_TIME',
      updatedAt: 'SERVER_TIME',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '6. Invalid Shift enum on AttendanceLog',
    collection: 'attendance_logs',
    docId: 'log_003',
    operation: 'create',
    payload: {
      date: '2026-11-25',
      employeeName: 'Risa',
      shift: 'malam',
      checkInTime: '09:00',
      checkOutTime: '',
      status: 'Tepat Waktu',
      lateMinutes: 0,
      note: '',
      createdAt: 'SERVER_TIME',
      updatedAt: 'SERVER_TIME',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '7. Malformed date string on AttendanceLog',
    collection: 'attendance_logs',
    docId: 'log_004',
    operation: 'create',
    payload: {
      date: '25-11-2026',
      employeeName: 'Risa',
      shift: 'pagi',
      checkInTime: '09:00',
      checkOutTime: '',
      status: 'Tepat Waktu',
      lateMinutes: 0,
      note: '',
      createdAt: 'SERVER_TIME',
      updatedAt: 'SERVER_TIME',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '8. Shadow field / status tampering on Check-Out update',
    collection: 'attendance_logs',
    docId: 'log_005',
    operation: 'update',
    payload: {
      checkOutTime: '17:00',
      status: 'Tepat Waktu',
      updatedAt: 'SERVER_TIME',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '9. Overwriting completed Check-Out',
    collection: 'attendance_logs',
    docId: 'log_006',
    operation: 'update',
    payload: { checkOutTime: '18:00', updatedAt: 'SERVER_TIME' },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '10. Checking out a Libur record',
    collection: 'attendance_logs',
    docId: 'log_007',
    operation: 'update',
    payload: { checkOutTime: '17:00', updatedAt: 'SERVER_TIME' },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '11. Arbitrary settings document ID',
    collection: 'settings',
    docId: 'hacked_doc',
    operation: 'create',
    payload: {
      storeName: 'SIBS-Mart',
      adminPinHash: 'sha256_000000000000',
      graceMinutes: 15,
      updatedAt: 'SERVER_TIME',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '12. Unmatched collection read/write',
    collection: 'admins',
    docId: 'any_uid',
    operation: 'read',
    expected: 'PERMISSION_DENIED',
  },
];

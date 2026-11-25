# SIBS-Mart Firestore Security Specification

## 1. Data Invariants
1. **No PII**: Employee documents store only first/display names (`name <= 40 chars`), no emails, phone numbers, or addresses.
2. **Strict Schema & Size Bounds**: Every document in `employees`, `attendance_logs`, and `settings` must pass `hasAll` + `hasOnly` key checks, regex ID checks (`^[a-zA-Z0-9_-]+$`), string length limits, enum validation (`shift`, `status`), integer bounds (`lateMinutes >= 0 && <= 1440`, `graceMinutes >= 0 && <= 120`), and server-enforced `request.time` timestamps.
3. **Immutable Audit Fields on Update**: `createdAt`, `date`, `employeeName`, `shift`, `checkInTime`, `status`, and `lateMinutes` on `attendance_logs` cannot be altered after creation; non-admin Check-Out updates may ONLY modify `['checkOutTime', 'note', 'updatedAt']` while `existing().checkOutTime == ''` and `existing().status in ['Tepat Waktu', 'Terlambat']`.
4. **Settings Document Containment**: Only the single document `settings/store` may exist, preventing arbitrary document spam in `settings`.
5. **Default-Deny Catch-All**: All unmatched paths are explicitly denied (`allow read, write: if false;`).

## 2. Dirty Dozen Attack Payloads (Expected: PERMISSION_DENIED)
1. **Ghost Field on Employee**: `{ name: "Risa", createdAt: serverTimestamp(), isAdmin: true }` -> Rejected by `hasOnly(['name', 'createdAt'])`.
2. **Oversized Employee Name**: `{ name: "<200 chars>", createdAt: serverTimestamp() }` -> Rejected by `name.size() <= 40`.
3. **Invalid Document ID Poisoning**: `/employees/invalid id with spaces!` -> Rejected by `isValidId(employeeId)`.
4. **Fake Timestamp on Log Create**: `{ ..., createdAt: "2020-01-01", updatedAt: serverTimestamp() }` -> Rejected by `createdAt == request.time`.
5. **Invalid Status Enum**: `{ ..., status: "AdminOverride" }` -> Rejected by `status in ['Tepat Waktu', 'Terlambat', 'Ijin', 'Libur']`.
6. **Invalid Shift Enum**: `{ ..., shift: "malam" }` -> Rejected by `shift in ['pagi', 'siang', 'seharian']`.
7. **Malformed Date String**: `{ ..., date: "25-11-2026" }` -> Rejected by `date.matches('^\\d{4}-\\d{2}-\\d{2}$')`.
8. **Shadow Field on Log Update**: `update({ checkOutTime: "17:00", updatedAt: serverTimestamp(), status: "Tepat Waktu" })` -> Rejected by `affectedKeys().hasOnly(['checkOutTime', 'note', 'updatedAt'])`.
9. **Overwrite Already Completed Check-Out**: Updating `checkOutTime` when `existing().checkOutTime != ''` -> Rejected by `existing().checkOutTime == ''`.
10. **Check-Out on Leave Record**: Updating `checkOutTime` when `existing().status == 'Libur'` -> Rejected by `existing().status in ['Tepat Waktu', 'Terlambat']`.
11. **Arbitrary Settings Doc ID**: Writing to `/settings/hacked_doc` -> Rejected by `settingId == 'store'`.
12. **Unmatched Collection Access**: Reading or writing `/admins/uid` or `/users/uid` -> Rejected by global default-deny catch-all.

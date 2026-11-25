import {
  AttendanceLog,
  AttendanceStatus,
  DEFAULT_EMPLOYEES,
  LogShiftId,
  SHIFT_CONFIG,
  ShiftId,
} from '../types/attendance';

const EMPLOYEES_STORAGE_KEY = 'sibs_mart_employees_v1';
const LOGS_STORAGE_KEY = 'sibs_mart_attendance_logs_v1';

export const SIBS_LOGO_PATH = `${import.meta.env.BASE_URL}assets/aistudio/logo_SIBS-mart_07e37887.jpeg`;

const MONTH_NAMES_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const SHORT_MONTH_NAMES_ID = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

const DAY_NAMES_ID = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
];

export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getLocalMonthString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function getDatesInRange(startDateStr: string, endDateStr: string): string[] {
  const [sy, sm, sd] = startDateStr.split('-').map(Number);
  const [ey, em, ed] = endDateStr.split('-').map(Number);
  if ([sy, sm, sd, ey, em, ed].some(Number.isNaN)) {
    return [];
  }
  const start = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);
  if (end < start) {
    return [];
  }

  const dates: string[] = [];
  const cursor = new Date(start);
  // Cap at 60 days per submission to prevent accidental massive loops
  let guard = 0;
  while (cursor <= end && guard < 60) {
    dates.push(getLocalDateString(cursor));
    cursor.setDate(cursor.getDate() + 1);
    guard += 1;
  }
  return dates;
}

export function getShiftDisplay(shift: LogShiftId): {
  label: string;
  shortLabel: string;
  timeRange: string;
} {
  if (shift === 'seharian') {
    return {
      label: 'Seharian (Full Day)',
      shortLabel: 'Seharian',
      timeRange: '09:00 - 21:00',
    };
  }
  const info = SHIFT_CONFIG[shift];
  return {
    label: info.label,
    shortLabel: info.shortLabel,
    timeRange: info.timeRange,
  };
}

export function formatTimeHHMM(date: Date = new Date()): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function formatTimeHHMMSS(date: Date = new Date()): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

export function formatIndonesianFullDate(date: Date): string {
  const dayName = DAY_NAMES_ID[date.getDay()];
  const dayNum = date.getDate();
  const monthName = MONTH_NAMES_ID[date.getMonth()];
  const year = date.getFullYear();
  return `${dayName}, ${dayNum} ${monthName} ${year}`;
}

export function formatIndonesianShortDate(yyyyMmDd: string): string {
  const parts = yyyyMmDd.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return yyyyMmDd;
  }
  const [year, month, day] = parts;
  const dateObj = new Date(year, month - 1, day);
  const dayName = DAY_NAMES_ID[dateObj.getDay()];
  const monthShort = SHORT_MONTH_NAMES_ID[month - 1] ?? '';
  return `${dayName}, ${day} ${monthShort} ${year}`;
}

export function formatIndonesianMonth(yyyyMm: string): string {
  const parts = yyyyMm.split('-').map(Number);
  if (parts.length !== 2 || parts.some(Number.isNaN)) {
    return yyyyMm;
  }
  const [year, month] = parts;
  const monthName = MONTH_NAMES_ID[month - 1] ?? '';
  return `${monthName} ${year}`;
}

export function calculateCheckInStatus(
  now: Date,
  shiftId: ShiftId
): { status: AttendanceStatus; lateMinutes: number } {
  const shift = SHIFT_CONFIG[shiftId];
  const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();
  const shiftStartMinutes = shift.startHour * 60 + shift.startMinute;
  const graceCutoffMinutes = shiftStartMinutes + shift.graceMinutes;

  if (currentTotalMinutes > graceCutoffMinutes) {
    return {
      status: 'Terlambat',
      lateMinutes: currentTotalMinutes - shiftStartMinutes,
    };
  }

  return {
    status: 'Tepat Waktu',
    lateMinutes: 0,
  };
}

export function loadEmployees(): string[] {
  try {
    const raw = localStorage.getItem(EMPLOYEES_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(
        EMPLOYEES_STORAGE_KEY,
        JSON.stringify(DEFAULT_EMPLOYEES)
      );
      return [...DEFAULT_EMPLOYEES];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const cleaned = parsed
        .filter((item): item is string => typeof item === 'string')
        .map((s) => s.trim())
        .filter(Boolean);
      return cleaned;
    }
  } catch {
    // Fall back to defaults if localStorage is unavailable or malformed
  }
  return [...DEFAULT_EMPLOYEES];
}

export function saveEmployees(employees: string[]): void {
  try {
    localStorage.setItem(EMPLOYEES_STORAGE_KEY, JSON.stringify(employees));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function loadAttendanceLogs(): AttendanceLog[] {
  try {
    const raw = localStorage.getItem(LOGS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (item): item is AttendanceLog =>
          Boolean(item) &&
          typeof item.id === 'string' &&
          typeof item.date === 'string' &&
          typeof item.employeeName === 'string' &&
          (item.shift === 'pagi' ||
            item.shift === 'siang' ||
            item.shift === 'seharian') &&
          (typeof item.checkInTime === 'string' || item.checkInTime === null)
      );
    }
  } catch {
    // Ignore malformed local storage
  }
  return [];
}

export function saveAttendanceLogs(logs: AttendanceLog[]): void {
  try {
    localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(logs));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

function escapeCsvCell(value: string): string {
  const stringValue = value ?? '';
  const escaped = stringValue.replace(/"/g, '""');
  return `"${escaped}"`;
}

export function exportAttendanceCsv(
  logs: AttendanceLog[],
  filename: string
): void {
  const headers = [
    'Tanggal',
    'Nama Karyawan',
    'Shift',
    'Jadwal Shift',
    'Jam Masuk',
    'Jam Pulang',
    'Status',
    'Catatan',
  ];

  const rows = logs.map((log) => {
    const shiftInfo = getShiftDisplay(log.shift);
    const statusLabel =
      log.status === 'Terlambat' && log.lateMinutes > 0
        ? `Terlambat (${log.lateMinutes} mnt)`
        : log.status;

    return [
      escapeCsvCell(log.date),
      escapeCsvCell(log.employeeName),
      escapeCsvCell(shiftInfo.shortLabel),
      escapeCsvCell(shiftInfo.timeRange),
      escapeCsvCell(log.checkInTime ?? '-'),
      escapeCsvCell(log.checkOutTime ?? '-'),
      escapeCsvCell(statusLabel),
      escapeCsvCell(log.note || '-'),
    ].join(',');
  });

  const csvContent = `\uFEFF${headers.map(escapeCsvCell).join(',')}\n${rows.join('\n')}`;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

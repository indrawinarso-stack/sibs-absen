export type ShiftId = 'pagi' | 'siang';

export type LogShiftId = ShiftId | 'seharian';

export type AttendanceStatus = 'Tepat Waktu' | 'Terlambat' | 'Ijin' | 'Libur';

export type LeaveType = 'Ijin' | 'Libur';

export type AppTab = 'absensi' | 'log';

export type LogFilterMode = 'date' | 'month' | 'all';

export interface ShiftDefinition {
  id: ShiftId;
  label: string;
  shortLabel: string;
  timeRange: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  graceMinutes: number;
  graceCutoffLabel: string;
}

export const SHIFT_CONFIG: Record<ShiftId, ShiftDefinition> = {
  pagi: {
    id: 'pagi',
    label: 'Shift Pagi',
    shortLabel: 'Pagi',
    timeRange: '09:00 - 17:00',
    startHour: 9,
    startMinute: 0,
    endHour: 17,
    endMinute: 0,
    graceMinutes: 15,
    graceCutoffLabel: '09:15',
  },
  siang: {
    id: 'siang',
    label: 'Shift Siang',
    shortLabel: 'Siang',
    timeRange: '13:00 - 21:00',
    startHour: 13,
    startMinute: 0,
    endHour: 21,
    endMinute: 0,
    graceMinutes: 15,
    graceCutoffLabel: '13:15',
  },
};

export const DEFAULT_EMPLOYEES: string[] = ['Risa', 'Zulfa'];

export interface AttendanceLog {
  id: string;
  date: string; // YYYY-MM-DD (local time)
  employeeName: string;
  shift: LogShiftId;
  checkInTime: string | null; // HH:mm or null for Ijin/Libur
  checkOutTime: string | null; // HH:mm or null
  status: AttendanceStatus;
  lateMinutes: number;
  note: string;
  createdAt: number;
}

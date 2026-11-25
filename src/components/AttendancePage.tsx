import { FormEvent, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  Lock,
  LogIn,
  LogOut,
  Send,
  Sun,
  Sunset,
  UserPlus,
} from 'lucide-react';
import {
  AttendanceLog,
  LeaveType,
  LogShiftId,
  SHIFT_CONFIG,
  ShiftId,
} from '../types/attendance';
import {
  formatIndonesianFullDate,
  formatTimeHHMM,
  formatTimeHHMMSS,
  getGraceCutoffLabel,
  getLocalDateString,
  getShiftDisplay,
  SIBS_LOGO_PATH,
} from '../utils/attendance';

type FormMode = 'attendance' | 'leave';

export interface LeaveSubmissionPayload {
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  shift: LogShiftId;
  note: string;
}

interface AttendancePageProps {
  now: Date;
  isAdmin: boolean;
  graceMinutes: number;
  employees: string[];
  selectedEmployee: string;
  onSelectEmployee: (name: string) => void;
  selectedShift: ShiftId;
  onSelectShift: (shift: ShiftId) => void;
  logs: AttendanceLog[];
  onCheckIn: (note: string) => Promise<boolean>;
  onCheckOut: (note: string) => Promise<boolean>;
  onSubmitLeave: (payload: LeaveSubmissionPayload) => Promise<boolean>;
  onOpenEmployeeModal: () => void;
  onNavigateToLog: () => void;
}

export function AttendancePage({
  now,
  isAdmin,
  graceMinutes,
  employees,
  selectedEmployee,
  onSelectEmployee,
  selectedShift,
  onSelectShift,
  logs,
  onCheckIn,
  onCheckOut,
  onSubmitLeave,
  onOpenEmployeeModal,
  onNavigateToLog,
}: AttendancePageProps) {
  const todayStr = getLocalDateString(now);

  const [formMode, setFormMode] = useState<FormMode>('attendance');
  const [note, setNote] = useState('');
  const [logoError, setLogoError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Leave / Permission state
  const [leaveType, setLeaveType] = useState<LeaveType>('Ijin');
  const [leaveStartDate, setLeaveStartDate] = useState<string>(todayStr);
  const [leaveEndDate, setLeaveEndDate] = useState<string>(todayStr);
  const [leaveShift, setLeaveShift] = useState<LogShiftId>('seharian');
  const [leaveNote, setLeaveNote] = useState<string>('');

  const currentHHMM = formatTimeHHMM(now);
  const currentHHMMSS = formatTimeHHMMSS(now);
  const fullDateLabel = formatIndonesianFullDate(now);

  const todayLogs = useMemo(
    () =>
      logs
        .filter((log) => log.date === todayStr)
        .sort((a, b) => b.createdAt - a.createdAt),
    [logs, todayStr]
  );

  // Non-admins only see the selected employee's own status today (coworker reports stay private)
  const visibleSnapshotLogs = useMemo(() => {
    if (isAdmin) {
      return todayLogs;
    }
    return todayLogs.filter((log) => log.employeeName === selectedEmployee);
  }, [isAdmin, todayLogs, selectedEmployee]);

  const selectedEmployeeTodayLeave = useMemo(
    () =>
      todayLogs.find(
        (log) =>
          log.employeeName === selectedEmployee &&
          (log.status === 'Ijin' || log.status === 'Libur')
      ),
    [todayLogs, selectedEmployee]
  );

  const selectedEmployeeTodayShiftLog = useMemo(
    () =>
      todayLogs.find(
        (log) =>
          log.employeeName === selectedEmployee &&
          log.shift === selectedShift &&
          (log.status === 'Tepat Waktu' || log.status === 'Terlambat')
      ),
    [todayLogs, selectedEmployee, selectedShift]
  );

  const selectedEmployeeOpenLog = useMemo(
    () =>
      todayLogs.find(
        (log) =>
          log.employeeName === selectedEmployee &&
          (log.status === 'Tepat Waktu' || log.status === 'Terlambat') &&
          log.checkOutTime === null
      ),
    [todayLogs, selectedEmployee]
  );

  const handleCheckInClick = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const success = await onCheckIn(note);
    setIsSubmitting(false);
    if (success) {
      setNote('');
    }
  };

  const handleCheckOutClick = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const success = await onCheckOut(note);
    setIsSubmitting(false);
    if (success) {
      setNote('');
    }
  };

  const handleLeaveSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    const success = await onSubmitLeave({
      leaveType,
      startDate: leaveStartDate,
      endDate: leaveEndDate,
      shift: leaveShift,
      note: leaveNote,
    });
    setIsSubmitting(false);
    if (success) {
      setLeaveNote('');
    }
  };

  const handleStartDateChange = (newStart: string) => {
    setLeaveStartDate(newStart);
    if (leaveEndDate < newStart) {
      setLeaveEndDate(newStart);
    }
  };

  const hasEmployees = employees.length > 0 && selectedEmployee !== '';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Column: Primary Check-In / Check-Out & Leave Request Workspace */}
      <section
        aria-label="Formulir absensi karyawan"
        className="lg:col-span-7 bg-white border border-emerald-200/80 shadow-sm shadow-emerald-950/5 rounded-2xl p-5 sm:p-8 space-y-6"
      >
        {/* Store Identity & Live Digital Clock */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-emerald-100">
          <div className="flex items-center gap-3.5">
            {!logoError ? (
              <img
                src={SIBS_LOGO_PATH}
                alt="Logo SIBS-Mart Mini Market Pesantren Situwangi"
                referrerPolicy="no-referrer"
                onError={() => setLogoError(true)}
                className="h-14 w-14 sm:h-16 sm:w-16 object-contain rounded-xl border border-emerald-200 bg-white p-1 shrink-0"
              />
            ) : (
              <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-xl bg-emerald-700 text-white font-display font-bold text-lg flex items-center justify-center shrink-0">
                SM
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-emerald-950 tracking-tight">
                Absensi SIBS-Mart
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                Mini Market Pesantren Situwangi
              </p>
            </div>
          </div>

          <div className="sm:text-right bg-gradient-to-br from-emerald-50 to-teal-50/70 px-4 py-3 sm:px-4 sm:py-2.5 rounded-xl border border-emerald-200/80">
            <div className="font-mono tabular-nums text-2xl sm:text-3xl font-semibold text-emerald-800 tracking-tight">
              {currentHHMMSS}
            </div>
            <div className="text-xs sm:text-sm text-emerald-900/75 mt-0.5">
              {fullDateLabel}
            </div>
          </div>
        </div>

        {/* Mode Switcher: Check-In/Out vs Pengajuan Libur/Ijin */}
        <div
          role="tablist"
          aria-label="Pilih jenis formulir"
          className="grid grid-cols-2 gap-1.5 bg-emerald-50/80 border border-emerald-200/70 p-1 rounded-xl"
        >
          <button
            type="button"
            role="tab"
            aria-selected={formMode === 'attendance'}
            onClick={() => setFormMode('attendance')}
            className={`min-h-[44px] px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${
              formMode === 'attendance'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-emerald-900/75 hover:text-emerald-950'
            }`}
          >
            <Clock className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Absen Masuk / Pulang</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={formMode === 'leave'}
            onClick={() => setFormMode('leave')}
            className={`min-h-[44px] px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${
              formMode === 'leave'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-emerald-900/75 hover:text-emerald-950'
            }`}
          >
            <CalendarDays className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Pengajuan Libur / Ijin</span>
          </button>
        </div>

        {/* Employee Dropdown + Admin-protected Manage Trigger */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="employee-select"
              className="block text-sm font-semibold text-slate-800"
            >
              Nama Karyawan
            </label>
            <button
              type="button"
              onClick={onOpenEmployeeModal}
              className="text-xs font-medium text-emerald-700 hover:text-emerald-900 flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-emerald-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            >
              {!isAdmin && <Lock className="w-3 h-3" aria-hidden="true" />}
              <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Kelola Nama</span>
            </button>
          </div>

          {employees.length > 0 ? (
            <select
              id="employee-select"
              value={selectedEmployee}
              onChange={(e) => onSelectEmployee(e.target.value)}
              className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 bg-white text-base font-medium text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
            >
              {employees.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          ) : (
            <div className="p-4 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/50 flex items-center justify-between gap-3">
              <span className="text-sm text-slate-600">
                Daftar karyawan kosong. Hubungi Admin untuk menambahkan nama.
              </span>
              <button
                type="button"
                onClick={onOpenEmployeeModal}
                className="min-h-[44px] px-4 rounded-xl bg-emerald-700 text-white text-sm font-medium whitespace-nowrap shrink-0"
              >
                Tambah Nama
              </button>
            </div>
          )}
        </div>

        {formMode === 'attendance' ? (
          <>
            {/* Shift Selection */}
            <div className="space-y-2">
              <span className="block text-sm font-semibold text-slate-800">
                Pilih Shift Kerja
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(['pagi', 'siang'] as ShiftId[]).map((shiftKey) => {
                  const shift = SHIFT_CONFIG[shiftKey];
                  const isSelected = selectedShift === shiftKey;
                  const ShiftIcon = shiftKey === 'pagi' ? Sun : Sunset;
                  const cutoff = getGraceCutoffLabel(shiftKey, graceMinutes);

                  return (
                    <button
                      key={shiftKey}
                      type="button"
                      onClick={() => onSelectShift(shiftKey)}
                      aria-pressed={isSelected}
                      className={`min-h-[68px] p-4 rounded-xl border text-left transition-colors flex items-start gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
                        isSelected
                          ? 'border-emerald-700 bg-emerald-50/90 text-emerald-950'
                          : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/30 text-slate-800'
                      }`}
                    >
                      <span
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                          isSelected
                            ? shiftKey === 'pagi'
                              ? 'bg-amber-500 text-white'
                              : 'bg-emerald-700 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <ShiftIcon className="w-4 h-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-bold leading-tight">
                          {shift.label}
                        </div>
                        <div className="font-mono tabular-nums text-xs text-slate-600 mt-1">
                          {shift.timeRange}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Batas tepat waktu {cutoff}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Notes */}
            <div className="space-y-2">
              <label
                htmlFor="attendance-note"
                className="block text-sm font-semibold text-slate-800"
              >
                Catatan{' '}
                <span className="font-normal text-slate-500">(Opsional)</span>
              </label>
              <textarea
                id="attendance-note"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={160}
                placeholder="Contoh: izin telat karena hujan, tukar shift, atau keterangan pulang..."
                className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 resize-none focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
              />
            </div>

            {/* Contextual Employee Status Hint */}
            {hasEmployees && (
              <div className="px-4 py-3 rounded-xl bg-emerald-50/70 border border-emerald-200/70 text-xs sm:text-sm text-slate-700 flex items-start gap-2.5">
                {selectedEmployeeOpenLog ? (
                  <>
                    <Clock
                      className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <span>
                      <strong className="font-semibold text-emerald-950">
                        {selectedEmployee}
                      </strong>{' '}
                      sudah Check-In{' '}
                      {getShiftDisplay(selectedEmployeeOpenLog.shift).label} pukul{' '}
                      <span className="font-mono tabular-nums font-medium">
                        {selectedEmployeeOpenLog.checkInTime}
                      </span>{' '}
                      ({selectedEmployeeOpenLog.status}). Silakan tekan Check-Out
                      saat jam pulang.
                    </span>
                  </>
                ) : selectedEmployeeTodayShiftLog ? (
                  <>
                    <CheckCircle2
                      className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <span>
                      <strong className="font-semibold text-emerald-950">
                        {selectedEmployee}
                      </strong>{' '}
                      telah menyelesaikan{' '}
                      {
                        getShiftDisplay(selectedEmployeeTodayShiftLog.shift)
                          .label
                      }{' '}
                      hari ini (
                      <span className="font-mono tabular-nums font-medium">
                        {selectedEmployeeTodayShiftLog.checkInTime} –{' '}
                        {selectedEmployeeTodayShiftLog.checkOutTime}
                      </span>
                      ).
                    </span>
                  </>
                ) : selectedEmployeeTodayLeave ? (
                  <>
                    <FileText
                      className="w-4 h-4 text-teal-700 shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <span>
                      <strong className="font-semibold text-emerald-950">
                        {selectedEmployee}
                      </strong>{' '}
                      tercatat{' '}
                      <strong className="font-semibold text-teal-800">
                        {selectedEmployeeTodayLeave.status}
                      </strong>{' '}
                      hari ini (
                      {getShiftDisplay(selectedEmployeeTodayLeave.shift).shortLabel}
                      {selectedEmployeeTodayLeave.note
                        ? ` · ${selectedEmployeeTodayLeave.note}`
                        : ''}
                      ).
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle
                      className="w-4 h-4 text-slate-500 shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <span>
                      <strong className="font-semibold text-emerald-950">
                        {selectedEmployee}
                      </strong>{' '}
                      belum mencatat absensi {SHIFT_CONFIG[selectedShift].label}{' '}
                      hari ini.
                    </span>
                  </>
                )}
              </div>
            )}

            {/* Two Large Action Buttons: Check-In & Check-Out */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              <button
                type="button"
                disabled={!hasEmployees || isSubmitting}
                onClick={handleCheckInClick}
                className="min-h-[64px] px-5 py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-200 disabled:text-slate-400 text-white transition-all active:scale-[0.99] flex items-center justify-center gap-3 shadow-sm shadow-emerald-900/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
              >
                <LogIn className="w-5 h-5 shrink-0" aria-hidden="true" />
                <div className="text-left">
                  <div className="text-base font-bold leading-tight">
                    Check-In (Masuk)
                  </div>
                  <div className="font-mono tabular-nums text-xs text-emerald-100 mt-0.5">
                    Catat waktu · {currentHHMM}
                  </div>
                </div>
              </button>

              <button
                type="button"
                disabled={!hasEmployees || isSubmitting}
                onClick={handleCheckOutClick}
                className="min-h-[64px] px-5 py-3.5 rounded-xl bg-white border-2 border-emerald-700 hover:bg-emerald-50 disabled:border-slate-200 disabled:text-slate-400 disabled:bg-slate-50 text-emerald-800 transition-all active:scale-[0.99] flex items-center justify-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
              >
                <LogOut className="w-5 h-5 shrink-0" aria-hidden="true" />
                <div className="text-left">
                  <div className="text-base font-bold leading-tight">
                    Check-Out (Pulang)
                  </div>
                  <div className="font-mono tabular-nums text-xs text-emerald-700 mt-0.5">
                    Catat waktu · {currentHHMM}
                  </div>
                </div>
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleLeaveSubmit} className="space-y-5">
            {/* Leave Type: Ijin vs Libur */}
            <div className="space-y-2">
              <span className="block text-sm font-semibold text-slate-800">
                Jenis Pengajuan
              </span>
              <div className="grid grid-cols-2 gap-3">
                {(['Ijin', 'Libur'] as LeaveType[]).map((type) => {
                  const isSelected = leaveType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setLeaveType(type)}
                      aria-pressed={isSelected}
                      className={`min-h-[60px] p-4 rounded-xl border text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
                        isSelected
                          ? 'border-emerald-700 bg-emerald-50/90 text-emerald-950'
                          : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/30 text-slate-800'
                      }`}
                    >
                      <div className="text-sm font-bold">{type}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {type === 'Ijin'
                          ? 'Sakit atau keperluan pribadi'
                          : 'Jadwal libur / cuti toko'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label
                  htmlFor="leave-start-date"
                  className="block text-sm font-semibold text-slate-800"
                >
                  Dari Tanggal
                </label>
                <input
                  id="leave-start-date"
                  type="date"
                  required
                  value={leaveStartDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 bg-white text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="leave-end-date"
                  className="block text-sm font-semibold text-slate-800"
                >
                  Sampai Tanggal
                </label>
                <input
                  id="leave-end-date"
                  type="date"
                  required
                  min={leaveStartDate}
                  value={leaveEndDate}
                  onChange={(e) => setLeaveEndDate(e.target.value)}
                  className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 bg-white text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
                />
              </div>
            </div>

            {/* Shift Covered */}
            <div className="space-y-1.5">
              <label
                htmlFor="leave-shift"
                className="block text-sm font-semibold text-slate-800"
              >
                Shift yang Diajukan
              </label>
              <select
                id="leave-shift"
                value={leaveShift}
                onChange={(e) => setLeaveShift(e.target.value as LogShiftId)}
                className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
              >
                <option value="seharian">
                  Seharian (Full Day · 09:00 - 21:00)
                </option>
                <option value="pagi">Shift Pagi (09:00 - 17:00)</option>
                <option value="siang">Shift Siang (13:00 - 21:00)</option>
              </select>
            </div>

            {/* Reason / Note */}
            <div className="space-y-1.5">
              <label
                htmlFor="leave-note"
                className="block text-sm font-semibold text-slate-800"
              >
                Alasan / Keterangan{' '}
                {leaveType === 'Ijin' ? (
                  <span className="text-emerald-700 font-medium">*</span>
                ) : (
                  <span className="font-normal text-slate-500">(Opsional)</span>
                )}
              </label>
              <textarea
                id="leave-note"
                rows={2}
                required={leaveType === 'Ijin'}
                value={leaveNote}
                onChange={(e) => setLeaveNote(e.target.value)}
                maxLength={160}
                placeholder={
                  leaveType === 'Ijin'
                    ? 'Tuliskan alasan ijin, misal: sakit demam atau acara keluarga...'
                    : 'Contoh: jadwal libur mingguan atau tukar hari libur...'
                }
                className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 resize-none focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
              />
            </div>

            <button
              type="submit"
              disabled={!hasEmployees || isSubmitting}
              className="w-full min-h-[56px] px-5 py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-200 disabled:text-slate-400 text-white text-base font-bold transition-all active:scale-[0.99] flex items-center justify-center gap-2.5 shadow-sm shadow-emerald-900/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
            >
              <Send className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>
                {isSubmitting
                  ? 'Menyimpan...'
                  : `Kirim Pengajuan ${leaveType}`}
              </span>
            </button>
          </form>
        )}
      </section>

      {/* Right Column: Employee-scoped status when locked, Full today snapshot when Admin */}
      <aside
        aria-label={
          isAdmin ? 'Ringkasan absensi hari ini' : 'Status karyawan hari ini'
        }
        className="lg:col-span-5 bg-white border border-emerald-200/80 shadow-sm shadow-emerald-950/5 rounded-2xl p-5 sm:p-7 space-y-5"
      >
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-emerald-100">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-emerald-950">
              {isAdmin
                ? 'Catatan Hari Ini (Semua)'
                : `Status ${selectedEmployee || 'Karyawan'} Hari Ini`}
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
              <span className="font-mono tabular-nums">
                {visibleSnapshotLogs.length} catatan
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {isAdmin ? 'Sinkron real-time aktif' : 'Tersinkron otomatis'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onNavigateToLog}
            className="min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-700 hover:bg-emerald-50 flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          >
            {!isAdmin && <Lock className="w-3.5 h-3.5" aria-hidden="true" />}
            <span>{isAdmin ? 'Lihat Laporan' : 'Laporan Admin'}</span>
            {isAdmin && (
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            )}
          </button>
        </div>

        {visibleSnapshotLogs.length === 0 ? (
          <div className="py-10 text-center space-y-2">
            <Clock
              className="w-8 h-8 text-emerald-200 mx-auto"
              aria-hidden="true"
            />
            <p className="text-sm font-medium text-slate-700">
              {isAdmin
                ? 'Belum ada catatan hari ini'
                : `${selectedEmployee || 'Karyawan'} belum ada catatan hari ini`}
            </p>
            <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
              {isAdmin
                ? 'Pilih nama karyawan di samping untuk melakukan Check-In atau mengajukan Libur / Ijin.'
                : 'Gunakan tombol Check-In atau tab Pengajuan Libur / Ijin di samping untuk mencatat kehadiran Anda.'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-emerald-100/70">
            {visibleSnapshotLogs.slice(0, 6).map((item) => {
              const isLate = item.status === 'Terlambat';
              const isLeave =
                item.status === 'Ijin' || item.status === 'Libur';
              const shiftInfo = getShiftDisplay(item.shift);

              return (
                <li
                  key={item.id}
                  className="py-3.5 first:pt-1 last:pb-1 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">
                      {item.employeeName}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 mt-0.5">
                      <span>{shiftInfo.label}</span>
                      {!isLeave && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums text-slate-700">
                            {item.checkInTime} – {item.checkOutTime ?? 'Aktif'}
                          </span>
                        </>
                      )}
                    </div>
                    {item.note && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                        Catatan: {item.note}
                      </p>
                    )}
                  </div>

                  <div
                    className={`flex items-center gap-1 text-xs font-semibold shrink-0 mt-0.5 ${
                      item.status === 'Terlambat'
                        ? 'text-amber-700'
                        : item.status === 'Ijin'
                          ? 'text-teal-700'
                          : item.status === 'Libur'
                            ? 'text-sky-700'
                            : 'text-emerald-700'
                    }`}
                  >
                    {isLate ? (
                      <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
                    ) : isLeave ? (
                      <CalendarDays className="w-3.5 h-3.5" aria-hidden="true" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                    <span>{item.status}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="pt-4 border-t border-emerald-100 space-y-1.5 text-xs text-slate-600">
          <div className="font-semibold text-emerald-950">
            Ketentuan Jam Kerja & Laporan SIBS-Mart
          </div>
          <p className="leading-relaxed">
            Shift Pagi (<span className="font-mono tabular-nums">09:00–17:00</span>)
            dan Shift Siang (<span className="font-mono tabular-nums">13:00–21:00</span>)
            memiliki toleransi{' '}
            <strong className="font-semibold text-emerald-900">
              {graceMinutes} menit
            </strong>
            . Seluruh data dan pengaturan tersinkron otomatis di semua
            perangkat.
          </p>
        </div>
      </aside>
    </div>
  );
}

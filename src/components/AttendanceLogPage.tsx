import { useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Download,
  FileText,
  KeyRound,
  RotateCcw,
  ShieldAlert,
  Trash2,
  Users,
} from 'lucide-react';
import {
  AttendanceLog,
  AttendanceStatus,
  LogFilterMode,
  LogShiftId,
} from '../types/attendance';
import {
  exportAttendanceCsv,
  formatIndonesianMonth,
  formatIndonesianShortDate,
  getLocalDateString,
  getLocalMonthString,
  getShiftDisplay,
} from '../utils/attendance';

interface AttendanceLogPageProps {
  now: Date;
  logs: AttendanceLog[];
  employees: string[];
  isUsingDefaultPin: boolean;
  onDeleteLog: (id: string) => void;
  onNavigateToAbsensi: () => void;
  onOpenEmployeeModal: () => void;
  onOpenChangePinModal: () => void;
  onNotify: (message: string, type?: 'success' | 'info' | 'warning') => void;
}

export function AttendanceLogPage({
  now,
  logs,
  employees,
  isUsingDefaultPin,
  onDeleteLog,
  onNavigateToAbsensi,
  onOpenEmployeeModal,
  onOpenChangePinModal,
  onNotify,
}: AttendanceLogPageProps) {
  const todayStr = getLocalDateString(now);
  const currentMonthStr = getLocalMonthString(now);

  const [filterMode, setFilterMode] = useState<LogFilterMode>('date');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  const [shiftFilter, setShiftFilter] = useState<'all' | LogShiftId>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | AttendanceStatus>(
    'all'
  );
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filterEmployeeOptions = useMemo(() => {
    const unique = new Set<string>(employees);
    logs.forEach((l) => unique.add(l.employeeName));
    return Array.from(unique).sort((a, b) => a.localeCompare(b, 'id'));
  }, [employees, logs]);

  const filteredLogs = useMemo(() => {
    return logs
      .filter((log) => {
        if (filterMode === 'date' && selectedDate) {
          if (log.date !== selectedDate) return false;
        } else if (filterMode === 'month' && selectedMonth) {
          if (!log.date.startsWith(selectedMonth)) return false;
        }
        if (employeeFilter !== 'all' && log.employeeName !== employeeFilter) {
          return false;
        }
        if (shiftFilter !== 'all' && log.shift !== shiftFilter) {
          return false;
        }
        if (statusFilter !== 'all' && log.status !== statusFilter) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.date !== b.date) {
          return b.date.localeCompare(a.date);
        }
        return b.createdAt - a.createdAt;
      });
  }, [
    logs,
    filterMode,
    selectedDate,
    selectedMonth,
    employeeFilter,
    shiftFilter,
    statusFilter,
  ]);

  const summary = useMemo(() => {
    const total = filteredLogs.length;
    let onTime = 0;
    let late = 0;
    let leave = 0;
    let notCheckedOut = 0;

    for (const item of filteredLogs) {
      if (item.status === 'Tepat Waktu') onTime += 1;
      if (item.status === 'Terlambat') late += 1;
      if (item.status === 'Ijin' || item.status === 'Libur') leave += 1;
      if (
        (item.status === 'Tepat Waktu' || item.status === 'Terlambat') &&
        item.checkOutTime === null
      ) {
        notCheckedOut += 1;
      }
    }

    return { total, onTime, late, leave, notCheckedOut };
  }, [filteredLogs]);

  const periodLabel = useMemo(() => {
    if (filterMode === 'date') {
      return selectedDate === todayStr
        ? `Hari Ini (${formatIndonesianShortDate(selectedDate)})`
        : formatIndonesianShortDate(selectedDate);
    }
    if (filterMode === 'month') {
      return `Bulan ${formatIndonesianMonth(selectedMonth)}`;
    }
    return 'Semua Riwayat';
  }, [filterMode, selectedDate, selectedMonth, todayStr]);

  const handleExportCsv = () => {
    if (filteredLogs.length === 0) {
      onNotify(
        'Tidak ada data pada filter saat ini untuk diekspor.',
        'warning'
      );
      return;
    }

    const suffix =
      filterMode === 'date'
        ? selectedDate
        : filterMode === 'month'
          ? `rekap-bulanan-${selectedMonth}`
          : 'semua-riwayat';

    const filename = `absensi-sibs-mart-${suffix}.csv`;
    exportAttendanceCsv(filteredLogs, filename);
    onNotify(`Berhasil mengekspor ${filteredLogs.length} baris ke ${filename}`);
  };

  const handleResetFilters = () => {
    setFilterMode('date');
    setSelectedDate(todayStr);
    setSelectedMonth(currentMonthStr);
    setEmployeeFilter('all');
    setShiftFilter('all');
    setStatusFilter('all');
  };

  const renderStatusLabel = (log: AttendanceLog) => {
    if (log.status === 'Terlambat') {
      return (
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Terlambat</span>
          {log.lateMinutes > 0 && (
            <span className="font-mono tabular-nums font-normal text-amber-600">
              (+{log.lateMinutes}m)
            </span>
          )}
        </div>
      );
    }
    if (log.status === 'Ijin') {
      return (
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700">
          <FileText className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Ijin</span>
        </div>
      );
    }
    if (log.status === 'Libur') {
      return (
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700">
          <CalendarDays className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Libur</span>
        </div>
      );
    }
    return (
      <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>Tepat Waktu</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Default PIN Security Reminder (visible only inside Admin view) */}
      {isUsingDefaultPin && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 text-xs sm:text-sm text-amber-950">
            <ShieldAlert
              className="w-5 h-5 text-amber-700 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <span>
              Anda masih menggunakan PIN bawaan Admin. Demi keamanan laporan,
              segera ganti dengan PIN pribadi Anda.
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenChangePinModal}
            className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold whitespace-nowrap shrink-0 self-start sm:self-auto"
          >
            Ubah PIN Sekarang
          </button>
        </div>
      )}

      {/* Page Title & Admin Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-blue-950 tracking-tight">
            Dashboard Laporan Admin
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Menampilkan data kehadiran, ijin & libur untuk {periodLabel}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenEmployeeModal}
            className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs sm:text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
          >
            <Users className="w-4 h-4 text-blue-700 shrink-0" aria-hidden="true" />
            <span>Kelola Karyawan</span>
          </button>

          <button
            type="button"
            onClick={onOpenChangePinModal}
            className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs sm:text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
          >
            <KeyRound
              className="w-4 h-4 text-blue-700 shrink-0"
              aria-hidden="true"
            />
            <span>Ubah PIN</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition-colors shadow-sm shadow-blue-900/10 whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            <Download className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>
              {filterMode === 'month'
                ? 'Export CSV Rekap Bulanan'
                : 'Export CSV (Excel)'}
            </span>
          </button>
        </div>
      </div>

      {/* Summary Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500">Total Data</div>
          <div className="font-mono tabular-nums text-2xl font-bold text-slate-900 mt-1">
            {summary.total}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500">Tepat Waktu</div>
          <div className="font-mono tabular-nums text-2xl font-bold text-emerald-700 mt-1">
            {summary.onTime}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500">Terlambat</div>
          <div className="font-mono tabular-nums text-2xl font-bold text-amber-700 mt-1">
            {summary.late}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500">Ijin / Libur</div>
          <div className="font-mono tabular-nums text-2xl font-bold text-indigo-700 mt-1">
            {summary.leave}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 col-span-2 sm:col-span-1">
          <div className="text-xs font-medium text-slate-500">
            Belum Check-Out
          </div>
          <div className="font-mono tabular-nums text-2xl font-bold text-blue-700 mt-1">
            {summary.notCheckedOut}
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <section
        aria-label="Filter riwayat kehadiran"
        className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div
            role="group"
            aria-label="Mode periode filter"
            className="inline-flex items-center bg-slate-100 p-1 rounded-xl self-start"
          >
            <button
              type="button"
              onClick={() => setFilterMode('date')}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                filterMode === 'date'
                  ? 'bg-white text-blue-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Per Tanggal
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('month')}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                filterMode === 'month'
                  ? 'bg-white text-blue-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rekap Bulanan
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                filterMode === 'all'
                  ? 'bg-white text-blue-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua Data
            </button>
          </div>

          <button
            type="button"
            onClick={handleResetFilters}
            className="min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 hover:text-blue-800 hover:bg-blue-50 inline-flex items-center gap-1.5 self-start md:self-auto transition-colors whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Reset ke Hari Ini</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {filterMode === 'date' && (
            <div className="space-y-1.5">
              <label
                htmlFor="filter-date"
                className="block text-xs font-semibold text-slate-600"
              >
                Pilih Tanggal
              </label>
              <input
                id="filter-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 bg-white text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
              />
            </div>
          )}

          {filterMode === 'month' && (
            <div className="space-y-1.5">
              <label
                htmlFor="filter-month"
                className="block text-xs font-semibold text-slate-600"
              >
                Pilih Bulan Rekap
              </label>
              <input
                id="filter-month"
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 bg-white text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
              />
            </div>
          )}

          {filterMode === 'all' && (
            <div className="space-y-1.5">
              <span className="block text-xs font-semibold text-slate-600">
                Periode
              </span>
              <div className="min-h-[44px] px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-600 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" aria-hidden="true" />
                <span>Seluruh catatan tersimpan</span>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label
              htmlFor="filter-employee"
              className="block text-xs font-semibold text-slate-600"
            >
              Filter Karyawan
            </label>
            <select
              id="filter-employee"
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
            >
              <option value="all">Semua Karyawan</option>
              {filterEmployeeOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="filter-shift"
              className="block text-xs font-semibold text-slate-600"
            >
              Filter Shift
            </label>
            <select
              id="filter-shift"
              value={shiftFilter}
              onChange={(e) =>
                setShiftFilter(e.target.value as 'all' | LogShiftId)
              }
              className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
            >
              <option value="all">Semua Shift</option>
              <option value="pagi">Pagi (09:00 - 17:00)</option>
              <option value="siang">Siang (13:00 - 21:00)</option>
              <option value="seharian">Seharian (Full Day)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="filter-status"
              className="block text-xs font-semibold text-slate-600"
            >
              Filter Status
            </label>
            <select
              id="filter-status"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as 'all' | AttendanceStatus)
              }
              className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
            >
              <option value="all">Semua Status</option>
              <option value="Tepat Waktu">Tepat Waktu</option>
              <option value="Terlambat">Terlambat</option>
              <option value="Ijin">Ijin</option>
              <option value="Libur">Libur</option>
            </select>
          </div>
        </div>
      </section>

      {/* Attendance History Table / Empty State */}
      <section
        aria-label="Tabel riwayat kehadiran"
        className="bg-white border border-slate-200 rounded-2xl overflow-hidden"
      >
        {filteredLogs.length === 0 ? (
          <div className="py-14 px-6 text-center space-y-3">
            <ClipboardList
              className="w-10 h-10 text-slate-300 mx-auto"
              aria-hidden="true"
            />
            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-900">
                Belum ada log kehadiran
              </h2>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                Tidak ditemukan data absensi, ijin, atau libur untuk{' '}
                {periodLabel.toLowerCase()}.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={onNavigateToAbsensi}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium transition-colors whitespace-nowrap"
              >
                Buka Halaman Absensi
              </button>
              {(employeeFilter !== 'all' ||
                shiftFilter !== 'all' ||
                statusFilter !== 'all' ||
                filterMode !== 'date' ||
                selectedDate !== todayStr) && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors whitespace-nowrap"
                >
                  Reset Filter
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                    <th className="py-3.5 px-4 whitespace-nowrap">Tanggal</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Nama</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Shift</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Jam Masuk</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Jam Pulang</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Status</th>
                    <th className="py-3.5 px-4">Catatan</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredLogs.map((log) => {
                    const shift = getShiftDisplay(log.shift);
                    const isConfirming = confirmDeleteId === log.id;

                    return (
                      <tr
                        key={log.id}
                        className="hover:bg-blue-50/40 transition-colors"
                      >
                        <td className="py-3.5 px-4 font-mono tabular-nums text-xs text-slate-600 whitespace-nowrap">
                          {log.date}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                          {log.employeeName}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                          <span className="font-medium">{shift.shortLabel}</span>{' '}
                          <span className="font-mono tabular-nums text-xs text-slate-500">
                            ({shift.timeRange})
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono tabular-nums whitespace-nowrap">
                          {log.checkInTime ? (
                            <span className="font-medium text-slate-900">
                              {log.checkInTime}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono tabular-nums whitespace-nowrap">
                          {log.checkOutTime ? (
                            <span className="font-medium text-slate-900">
                              {log.checkOutTime}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {renderStatusLabel(log)}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 max-w-xs">
                          {log.note ? (
                            <span className="line-clamp-2">{log.note}</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          {isConfirming ? (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteLog(log.id);
                                  setConfirmDeleteId(null);
                                }}
                                className="min-h-[34px] px-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium"
                              >
                                Hapus
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="min-h-[34px] px-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium"
                              >
                                Batal
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(log.id)}
                              className="min-h-[36px] min-w-[36px] p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 inline-flex items-center justify-center transition-colors"
                              aria-label={`Hapus catatan ${log.employeeName} tanggal ${log.date}`}
                              title="Hapus catatan"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <ul className="md:hidden divide-y divide-slate-200">
              {filteredLogs.map((log) => {
                const shift = getShiftDisplay(log.shift);
                const isLeave =
                  log.status === 'Ijin' || log.status === 'Libur';
                const isConfirming = confirmDeleteId === log.id;

                return (
                  <li key={log.id} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-base font-bold text-slate-900 truncate">
                          {log.employeeName}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                          <span className="font-mono tabular-nums">
                            {log.date}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>
                            {shift.label} ({shift.timeRange})
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0">{renderStatusLabel(log)}</div>
                    </div>

                    {!isLeave && (
                      <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                        <div className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                          <span className="text-slate-500 block">
                            Jam Masuk
                          </span>
                          <span className="font-mono tabular-nums text-sm font-semibold text-slate-900">
                            {log.checkInTime ?? '—'}
                          </span>
                        </div>
                        <div className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                          <span className="text-slate-500 block">
                            Jam Pulang
                          </span>
                          <span className="font-mono tabular-nums text-sm font-semibold text-slate-900">
                            {log.checkOutTime ?? 'Belum Pulang'}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-3 pt-1">
                      <p className="text-xs text-slate-600 min-w-0 truncate">
                        {log.note ? `Catatan: ${log.note}` : 'Tanpa catatan'}
                      </p>

                      {isConfirming ? (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteLog(log.id);
                              setConfirmDeleteId(null);
                            }}
                            className="min-h-[36px] px-3 rounded-lg bg-red-600 text-white text-xs font-medium"
                          >
                            Hapus
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="min-h-[36px] px-3 rounded-lg border border-slate-200 text-slate-600 text-xs font-medium"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(log.id)}
                          className="min-h-[40px] px-2.5 rounded-lg text-xs font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 flex items-center gap-1 shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Hapus</span>
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}

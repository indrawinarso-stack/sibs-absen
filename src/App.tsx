import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { AdminLoginForm, AdminLoginModal } from './components/AdminLoginModal';
import { AttendanceLogPage } from './components/AttendanceLogPage';
import {
  AttendancePage,
  LeaveSubmissionPayload,
} from './components/AttendancePage';
import { ChangePinModal } from './components/ChangePinModal';
import { EmployeeModal } from './components/EmployeeModal';
import { Header } from './components/Header';
import {
  AppTab,
  AttendanceLog,
  SHIFT_CONFIG,
  ShiftId,
} from './types/attendance';
import {
  changeAdminPin,
  isUsingDefaultAdminPin,
  loadAdminSession,
  saveAdminSession,
  verifyAdminPin,
} from './utils/adminAuth';
import {
  calculateCheckInStatus,
  formatTimeHHMM,
  getDatesInRange,
  getLocalDateString,
  loadAttendanceLogs,
  loadEmployees,
  saveAttendanceLogs,
  saveEmployees,
} from './utils/attendance';

interface ToastState {
  id: number;
  message: string;
  type: 'success' | 'info' | 'warning';
}

type PendingAdminAction = 'open_log' | 'open_employees' | null;

function getDefaultShift(date: Date): ShiftId {
  const totalMinutes = date.getHours() * 60 + date.getMinutes();
  return totalMinutes >= 11 * 60 + 30 ? 'siang' : 'pagi';
}

function generateLogId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function App() {
  const [now, setNow] = useState<Date>(() => new Date());
  const [activeTab, setActiveTab] = useState<AppTab>('absensi');
  const [isAdmin, setIsAdmin] = useState<boolean>(() => loadAdminSession());
  const [isUsingDefaultPin, setIsUsingDefaultPin] = useState<boolean>(false);

  const [employees, setEmployees] = useState<string[]>(() => loadEmployees());
  const [logs, setLogs] = useState<AttendanceLog[]>(() =>
    loadAttendanceLogs()
  );

  const [selectedEmployee, setSelectedEmployee] = useState<string>(() => {
    const initial = loadEmployees();
    return initial[0] ?? '';
  });
  const [selectedShift, setSelectedShift] = useState<ShiftId>(() =>
    getDefaultShift(new Date())
  );

  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState(false);
  const [isChangePinModalOpen, setIsChangePinModalOpen] = useState(false);
  const [pendingAdminAction, setPendingAdminAction] =
    useState<PendingAdminAction>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Live clock tick every 1 second
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  // Check if default PIN is still in use whenever admin logs in
  useEffect(() => {
    if (!isAdmin) {
      setIsUsingDefaultPin(false);
      return;
    }
    let mounted = true;
    isUsingDefaultAdminPin().then((result) => {
      if (mounted) setIsUsingDefaultPin(result);
    });
    return () => {
      mounted = false;
    };
  }, [isAdmin]);

  // Auto-dismiss toast after 4 seconds
  useEffect(() => {
    if (!toast) return;
    const timeoutId = window.setTimeout(() => {
      setToast(null);
    }, 4000);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  const notify = useCallback(
    (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
      setToast({ id: Date.now(), message, type });
    },
    []
  );

  // Keep selectedEmployee valid if employee list changes
  useEffect(() => {
    if (employees.length === 0) {
      if (selectedEmployee !== '') setSelectedEmployee('');
      return;
    }
    if (!employees.includes(selectedEmployee)) {
      setSelectedEmployee(employees[0]);
    }
  }, [employees, selectedEmployee]);

  const todayStr = getLocalDateString(now);

  const todayLogCount = useMemo(
    () => logs.filter((log) => log.date === todayStr).length,
    [logs, todayStr]
  );

  const handleVerifyAdminPin = async (pin: string): Promise<boolean> => {
    const valid = await verifyAdminPin(pin);
    if (!valid) return false;

    setIsAdmin(true);
    saveAdminSession(true);
    setIsAdminLoginModalOpen(false);

    if (pendingAdminAction === 'open_employees') {
      setIsEmployeeModalOpen(true);
    } else if (pendingAdminAction === 'open_log') {
      setActiveTab('log');
    }
    setPendingAdminAction(null);
    notify('Mode Admin aktif. Akses laporan dan kelola karyawan dibuka.');
    return true;
  };

  const handleLogoutAdmin = () => {
    setIsAdmin(false);
    saveAdminSession(false);
    setIsEmployeeModalOpen(false);
    setIsChangePinModalOpen(false);
    setPendingAdminAction(null);
    if (activeTab === 'log') {
      setActiveTab('absensi');
    }
    notify('Mode Admin dikunci. Akses laporan ditutup.', 'info');
  };

  const handleOpenEmployeeModal = () => {
    if (!isAdmin) {
      setPendingAdminAction('open_employees');
      setIsAdminLoginModalOpen(true);
      return;
    }
    setIsEmployeeModalOpen(true);
  };

  const handleRequestAdminLoginFromHeader = () => {
    setPendingAdminAction('open_log');
    setIsAdminLoginModalOpen(true);
  };

  const handleChangePin = async (currentPin: string, newPin: string) => {
    const result = await changeAdminPin(currentPin, newPin);
    if (result.ok) {
      setIsUsingDefaultPin(await isUsingDefaultAdminPin());
      notify('PIN Admin berhasil diperbarui.');
    }
    return result;
  };

  const handleAddEmployee = (
    rawName: string
  ): { ok: boolean; error?: string } => {
    if (!isAdmin) {
      return { ok: false, error: 'Hanya Admin yang dapat menambah karyawan.' };
    }
    const trimmed = rawName.trim();
    if (!trimmed) {
      return { ok: false, error: 'Nama karyawan tidak boleh kosong.' };
    }
    const exists = employees.some(
      (name) => name.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      return { ok: false, error: `Nama "${trimmed}" sudah ada di daftar.` };
    }

    const updated = [...employees, trimmed];
    setEmployees(updated);
    saveEmployees(updated);
    setSelectedEmployee(trimmed);
    notify(`Karyawan "${trimmed}" ditambahkan ke daftar.`);
    return { ok: true };
  };

  const handleRemoveEmployee = (nameToRemove: string) => {
    if (!isAdmin) return;
    const updated = employees.filter((name) => name !== nameToRemove);
    setEmployees(updated);
    saveEmployees(updated);
    notify(`Karyawan "${nameToRemove}" dihapus dari daftar.`, 'info');
  };

  const handleCheckIn = (rawNote: string): boolean => {
    if (!selectedEmployee) {
      notify('Pilih atau tambahkan nama karyawan terlebih dahulu.', 'warning');
      return false;
    }

    const currentNow = new Date();
    const dateStr = getLocalDateString(currentNow);
    const timeHHMM = formatTimeHHMM(currentNow);
    const shiftInfo = SHIFT_CONFIG[selectedShift];

    const existingConflict = logs.find(
      (log) =>
        log.date === dateStr &&
        log.employeeName === selectedEmployee &&
        (log.shift === selectedShift || log.shift === 'seharian')
    );

    if (existingConflict) {
      if (
        existingConflict.status === 'Ijin' ||
        existingConflict.status === 'Libur'
      ) {
        notify(
          `${selectedEmployee} sudah tercatat ${existingConflict.status} untuk hari ini.`,
          'warning'
        );
      } else {
        notify(
          `${selectedEmployee} sudah Check-In ${shiftInfo.label} hari ini pukul ${existingConflict.checkInTime}.`,
          'warning'
        );
      }
      return false;
    }

    const { status, lateMinutes } = calculateCheckInStatus(
      currentNow,
      selectedShift
    );

    const newRecord: AttendanceLog = {
      id: generateLogId(),
      date: dateStr,
      employeeName: selectedEmployee,
      shift: selectedShift,
      checkInTime: timeHHMM,
      checkOutTime: null,
      status,
      lateMinutes,
      note: rawNote.trim(),
      createdAt: currentNow.getTime(),
    };

    const updatedLogs = [newRecord, ...logs];
    setLogs(updatedLogs);
    saveAttendanceLogs(updatedLogs);

    notify(
      `Check-In ${selectedEmployee} (${shiftInfo.shortLabel}) pukul ${timeHHMM} · ${status}`,
      status === 'Terlambat' ? 'info' : 'success'
    );
    return true;
  };

  const handleCheckOut = (rawNote: string): boolean => {
    if (!selectedEmployee) {
      notify('Pilih nama karyawan terlebih dahulu.', 'warning');
      return false;
    }

    const currentNow = new Date();
    const dateStr = getLocalDateString(currentNow);
    const timeHHMM = formatTimeHHMM(currentNow);

    const isWorkEntry = (log: AttendanceLog) =>
      log.status === 'Tepat Waktu' || log.status === 'Terlambat';

    const openLog =
      logs.find(
        (log) =>
          log.date === dateStr &&
          log.employeeName === selectedEmployee &&
          log.shift === selectedShift &&
          isWorkEntry(log) &&
          log.checkOutTime === null
      ) ??
      logs.find(
        (log) =>
          log.date === dateStr &&
          log.employeeName === selectedEmployee &&
          isWorkEntry(log) &&
          log.checkOutTime === null
      );

    if (!openLog) {
      const completedToday = logs.find(
        (log) =>
          log.date === dateStr &&
          log.employeeName === selectedEmployee &&
          isWorkEntry(log) &&
          log.checkOutTime !== null
      );
      if (completedToday) {
        notify(
          `${selectedEmployee} sudah melakukan Check-Out hari ini pukul ${completedToday.checkOutTime}.`,
          'warning'
        );
      } else {
        notify(
          `${selectedEmployee} belum Check-In hari ini. Silakan Check-In terlebih dahulu.`,
          'warning'
        );
      }
      return false;
    }

    const trimmedNote = rawNote.trim();
    const updatedLogs = logs.map((log) => {
      if (log.id !== openLog.id) return log;
      let mergedNote = log.note;
      if (trimmedNote) {
        mergedNote = log.note
          ? `${log.note} | Pulang: ${trimmedNote}`
          : trimmedNote;
      }
      return {
        ...log,
        checkOutTime: timeHHMM,
        note: mergedNote,
      };
    });

    setLogs(updatedLogs);
    saveAttendanceLogs(updatedLogs);
    notify(`Check-Out ${selectedEmployee} tercatat pukul ${timeHHMM}.`);
    return true;
  };

  const handleSubmitLeave = (payload: LeaveSubmissionPayload): boolean => {
    if (!selectedEmployee) {
      notify('Pilih atau tambahkan nama karyawan terlebih dahulu.', 'warning');
      return false;
    }

    const dates = getDatesInRange(payload.startDate, payload.endDate);
    if (dates.length === 0) {
      notify(
        'Rentang tanggal tidak valid. Pastikan tanggal selesai tidak lebih awal dari tanggal mulai.',
        'warning'
      );
      return false;
    }

    const trimmedNote = payload.note.trim();
    if (payload.leaveType === 'Ijin' && !trimmedNote) {
      notify('Mohon isi alasan/keterangan untuk pengajuan Ijin.', 'warning');
      return false;
    }

    const baseTime = Date.now();
    const newRecords: AttendanceLog[] = [];
    let skippedCount = 0;

    dates.forEach((dateStr, idx) => {
      const conflict = logs.some(
        (log) =>
          log.date === dateStr &&
          log.employeeName === selectedEmployee &&
          (payload.shift === 'seharian' ||
            log.shift === 'seharian' ||
            log.shift === payload.shift)
      );

      if (conflict) {
        skippedCount += 1;
        return;
      }

      newRecords.push({
        id: generateLogId(),
        date: dateStr,
        employeeName: selectedEmployee,
        shift: payload.shift,
        checkInTime: null,
        checkOutTime: null,
        status: payload.leaveType,
        lateMinutes: 0,
        note:
          trimmedNote ||
          (payload.leaveType === 'Libur' ? 'Jadwal libur' : 'Ijin'),
        createdAt: baseTime + idx,
      });
    });

    if (newRecords.length === 0) {
      notify(
        `${selectedEmployee} sudah memiliki catatan absensi/ijin/libur pada tanggal yang dipilih.`,
        'warning'
      );
      return false;
    }

    const updatedLogs = [...newRecords.reverse(), ...logs];
    setLogs(updatedLogs);
    saveAttendanceLogs(updatedLogs);

    const skippedText =
      skippedCount > 0
        ? ` (${skippedCount} tanggal dilewati karena sudah ada data)`
        : '';
    notify(
      `Pengajuan ${payload.leaveType} ${selectedEmployee} untuk ${newRecords.length} hari tercatat ke laporan.${skippedText}`
    );
    return true;
  };

  const handleDeleteLog = (id: string) => {
    if (!isAdmin) return;
    const updatedLogs = logs.filter((log) => log.id !== id);
    setLogs(updatedLogs);
    saveAttendanceLogs(updatedLogs);
    notify('Catatan absensi dihapus.', 'info');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isAdmin={isAdmin}
        onRequestAdminLogin={handleRequestAdminLoginFromHeader}
        onLogoutAdmin={handleLogoutAdmin}
        todayLogCount={todayLogCount}
      />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {activeTab === 'absensi' ? (
          <AttendancePage
            now={now}
            isAdmin={isAdmin}
            employees={employees}
            selectedEmployee={selectedEmployee}
            onSelectEmployee={setSelectedEmployee}
            selectedShift={selectedShift}
            onSelectShift={setSelectedShift}
            logs={logs}
            onCheckIn={handleCheckIn}
            onCheckOut={handleCheckOut}
            onSubmitLeave={handleSubmitLeave}
            onOpenEmployeeModal={handleOpenEmployeeModal}
            onNavigateToLog={() => setActiveTab('log')}
          />
        ) : isAdmin ? (
          <AttendanceLogPage
            now={now}
            logs={logs}
            employees={employees}
            isUsingDefaultPin={isUsingDefaultPin}
            onDeleteLog={handleDeleteLog}
            onNavigateToAbsensi={() => setActiveTab('absensi')}
            onOpenEmployeeModal={handleOpenEmployeeModal}
            onOpenChangePinModal={() => setIsChangePinModalOpen(true)}
            onNotify={notify}
          />
        ) : (
          <section
            aria-label="Gerbang akses laporan admin"
            className="max-w-md mx-auto mt-4 sm:mt-10 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs"
          >
            <AdminLoginForm
              onSubmitPin={handleVerifyAdminPin}
              title="Laporan Khusus Admin"
              subtitle="Karyawan tidak memiliki akses ke halaman laporan. Masukkan PIN Admin SIBS-Mart untuk melanjutkan."
              submitLabel="Buka Laporan Admin"
            />
            <button
              type="button"
              onClick={() => setActiveTab('absensi')}
              className="w-full min-h-[44px] mt-3 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
            >
              Kembali ke Halaman Absensi
            </button>
          </section>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>SIBS-Mart · Mini Market Pesantren Situwangi</span>
          <span>Data absensi tersimpan otomatis di Local Storage browser</span>
        </div>
      </footer>

      <AdminLoginModal
        isOpen={isAdminLoginModalOpen}
        onClose={() => {
          setIsAdminLoginModalOpen(false);
          setPendingAdminAction(null);
        }}
        onSubmitPin={handleVerifyAdminPin}
        purposeLabel={
          pendingAdminAction === 'open_employees'
            ? 'Masukkan PIN Admin untuk menambah atau menghapus daftar nama karyawan.'
            : 'Masukkan PIN Admin untuk mengakses laporan kehadiran dan pengaturan toko.'
        }
      />

      {isAdmin && (
        <>
          <EmployeeModal
            isOpen={isEmployeeModalOpen}
            employees={employees}
            onClose={() => setIsEmployeeModalOpen(false)}
            onAddEmployee={handleAddEmployee}
            onRemoveEmployee={handleRemoveEmployee}
          />

          <ChangePinModal
            isOpen={isChangePinModalOpen}
            onClose={() => setIsChangePinModalOpen(false)}
            onChangePin={handleChangePin}
          />
        </>
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 right-4 left-4 sm:left-auto sm:max-w-md z-50"
        >
          <div
            className={`flex items-start gap-3 px-4 py-3.5 rounded-xl border shadow-lg bg-white ${
              toast.type === 'warning'
                ? 'border-amber-300 text-amber-950'
                : toast.type === 'info'
                  ? 'border-blue-200 text-slate-900'
                  : 'border-emerald-300 text-slate-900'
            }`}
          >
            {toast.type === 'warning' ? (
              <AlertTriangle
                className="w-5 h-5 text-amber-600 shrink-0 mt-0.5"
                aria-hidden="true"
              />
            ) : toast.type === 'info' ? (
              <Info
                className="w-5 h-5 text-blue-700 shrink-0 mt-0.5"
                aria-hidden="true"
              />
            ) : (
              <CheckCircle2
                className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5"
                aria-hidden="true"
              />
            )}
            <p className="text-sm font-medium flex-1 leading-snug">
              {toast.message}
            </p>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0"
              aria-label="Tutup notifikasi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

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
  checkOutAttendanceLogDoc,
  createAttendanceLogDoc,
  createEmployeeDoc,
  deleteAttendanceLogDoc,
  deleteEmployeeDoc,
  initializeCloudStoreIfNeeded,
  subscribeAttendanceLogs,
  subscribeEmployees,
  subscribeStoreSettings,
  updateStoreSettingsDoc,
} from './services/firestoreSync';
import {
  AppTab,
  AttendanceLog,
  DEFAULT_GRACE_MINUTES,
  DEFAULT_STORE_NAME,
  EmployeeItem,
  SHIFT_CONFIG,
  ShiftId,
  StoreSettings,
} from './types/attendance';
import {
  getCachedPinHash,
  getDefaultPinHash,
  hashPin,
  isHashDefaultAdminPin,
  loadAdminSession,
  saveAdminSession,
  saveCachedPinHash,
  verifyAdminPin,
} from './utils/adminAuth';
import {
  calculateCheckInStatus,
  formatTimeHHMM,
  getDatesInRange,
  getLocalDateString,
  loadAttendanceLogs,
  loadCachedEmployeeItems,
  loadCachedSettings,
  saveAttendanceLogs,
  saveCachedSettings,
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

export default function App() {
  const [now, setNow] = useState<Date>(() => new Date());
  const [activeTab, setActiveTab] = useState<AppTab>('absensi');
  const [isAdmin, setIsAdmin] = useState<boolean>(() => loadAdminSession());
  const [isUsingDefaultPin, setIsUsingDefaultPin] = useState<boolean>(false);

  const [employeeItems, setEmployeeItems] = useState<EmployeeItem[]>(() =>
    loadCachedEmployeeItems()
  );
  const [logs, setLogs] = useState<AttendanceLog[]>(() =>
    loadAttendanceLogs()
  );
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(() => {
    const cached = loadCachedSettings();
    return {
      storeName: cached.storeName || DEFAULT_STORE_NAME,
      adminPinHash: cached.adminPinHash || getCachedPinHash() || '',
      graceMinutes:
        typeof cached.graceMinutes === 'number'
          ? cached.graceMinutes
          : DEFAULT_GRACE_MINUTES,
    };
  });
  const [syncError, setSyncError] = useState<Error | null>(null);

  const employees = useMemo(
    () => employeeItems.map((e) => e.name),
    [employeeItems]
  );

  const [selectedEmployee, setSelectedEmployee] = useState<string>(() => {
    const initial = loadCachedEmployeeItems();
    return initial[0]?.name ?? '';
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

  if (syncError) {
    throw syncError;
  }

  // Live clock tick every 1 second
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  // Initialize and subscribe to Firestore real-time updates across all devices
  useEffect(() => {
    let active = true;
    void initializeCloudStoreIfNeeded().catch((err) => {
      console.error('Failed to initialize cloud store:', err);
    });

    const unsubEmployees = subscribeEmployees(
      (items) => {
        if (!active) return;
        setEmployeeItems(items);
        saveEmployees(items.map((i) => i.name));
      },
      (err) => {
        if (active) setSyncError(err);
      }
    );

    const unsubLogs = subscribeAttendanceLogs(
      (items) => {
        if (!active) return;
        setLogs(items);
        saveAttendanceLogs(items);
      },
      (err) => {
        if (active) setSyncError(err);
      }
    );

    const unsubSettings = subscribeStoreSettings(
      (settings) => {
        if (!active || !settings) return;
        setStoreSettings(settings);
        saveCachedSettings(settings);
        if (settings.adminPinHash) {
          saveCachedPinHash(settings.adminPinHash);
        }
      },
      (err) => {
        if (active) setSyncError(err);
      }
    );

    return () => {
      active = false;
      unsubEmployees();
      unsubLogs();
      unsubSettings();
    };
  }, []);

  // Check if default PIN is still in use whenever admin logs in or settings change
  useEffect(() => {
    if (!isAdmin) {
      setIsUsingDefaultPin(false);
      return;
    }
    let mounted = true;
    void isHashDefaultAdminPin(storeSettings.adminPinHash).then((result) => {
      if (mounted) setIsUsingDefaultPin(result);
    });
    return () => {
      mounted = false;
    };
  }, [isAdmin, storeSettings.adminPinHash]);

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
    const valid = await verifyAdminPin(pin, storeSettings.adminPinHash);
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
    notify('Mode Admin aktif. Akses laporan dan pengaturan dibuka.');
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

  const handleSaveStoreSettings = async (payload: {
    graceMinutes: number;
    currentPin?: string;
    newPin?: string;
  }): Promise<{ ok: boolean; error?: string }> => {
    let nextPinHash =
      storeSettings.adminPinHash || (await getDefaultPinHash());

    if (payload.newPin && payload.currentPin !== undefined) {
      const validCurrent = await verifyAdminPin(
        payload.currentPin,
        storeSettings.adminPinHash
      );
      if (!validCurrent) {
        return { ok: false, error: 'PIN Admin saat ini tidak sesuai.' };
      }
      nextPinHash = await hashPin(payload.newPin.trim());
    }

    const updatedSettings: StoreSettings = {
      storeName: storeSettings.storeName || DEFAULT_STORE_NAME,
      adminPinHash: nextPinHash,
      graceMinutes: payload.graceMinutes,
    };

    try {
      await updateStoreSettingsDoc(updatedSettings);
      notify(
        'Pengaturan toko & PIN berhasil disimpan dan tersinkron ke semua perangkat.'
      );
      return { ok: true };
    } catch {
      return { ok: false, error: 'Gagal menyinkronkan pengaturan ke server.' };
    }
  };

  const handleAddEmployee = async (
    rawName: string
  ): Promise<{ ok: boolean; error?: string }> => {
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

    try {
      await createEmployeeDoc(trimmed);
      setSelectedEmployee(trimmed);
      notify(`Karyawan "${trimmed}" ditambahkan dan tersinkron ke semua perangkat.`);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Gagal menyimpan karyawan ke database.' };
    }
  };

  const handleRemoveEmployee = async (employee: EmployeeItem): Promise<void> => {
    if (!isAdmin) return;
    try {
      await deleteEmployeeDoc(employee.id);
      notify(`Karyawan "${employee.name}" dihapus dari daftar.`, 'info');
    } catch {
      notify('Gagal menghapus karyawan dari database.', 'warning');
    }
  };

  const handleCheckIn = async (rawNote: string): Promise<boolean> => {
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
      selectedShift,
      storeSettings.graceMinutes
    );

    try {
      await createAttendanceLogDoc({
        date: dateStr,
        employeeName: selectedEmployee,
        shift: selectedShift,
        checkInTime: timeHHMM,
        checkOutTime: null,
        status,
        lateMinutes,
        note: rawNote.trim(),
      });

      notify(
        `Check-In ${selectedEmployee} (${shiftInfo.shortLabel}) pukul ${timeHHMM} · ${status}`,
        status === 'Terlambat' ? 'info' : 'success'
      );
      return true;
    } catch {
      notify('Gagal mengirim Check-In. Periksa koneksi internet.', 'warning');
      return false;
    }
  };

  const handleCheckOut = async (rawNote: string): Promise<boolean> => {
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
    let mergedNote = openLog.note;
    if (trimmedNote) {
      mergedNote = openLog.note
        ? `${openLog.note} | Pulang: ${trimmedNote}`
        : trimmedNote;
    }

    try {
      await checkOutAttendanceLogDoc(openLog.id, timeHHMM, mergedNote);
      notify(`Check-Out ${selectedEmployee} tercatat pukul ${timeHHMM}.`);
      return true;
    } catch {
      notify('Gagal mengirim Check-Out. Periksa koneksi internet.', 'warning');
      return false;
    }
  };

  const handleSubmitLeave = async (
    payload: LeaveSubmissionPayload
  ): Promise<boolean> => {
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

    const validDates: string[] = [];
    let skippedCount = 0;

    for (const dateStr of dates) {
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
      } else {
        validDates.push(dateStr);
      }
    }

    if (validDates.length === 0) {
      notify(
        `${selectedEmployee} sudah memiliki catatan absensi/ijin/libur pada tanggal yang dipilih.`,
        'warning'
      );
      return false;
    }

    try {
      await Promise.all(
        validDates.map((dateStr) =>
          createAttendanceLogDoc({
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
          })
        )
      );

      const skippedText =
        skippedCount > 0
          ? ` (${skippedCount} tanggal dilewati karena sudah ada data)`
          : '';
      notify(
        `Pengajuan ${payload.leaveType} ${selectedEmployee} untuk ${validDates.length} hari tercatat ke laporan.${skippedText}`
      );
      return true;
    } catch {
      notify('Gagal mengirim pengajuan. Periksa koneksi internet.', 'warning');
      return false;
    }
  };

  const handleDeleteLog = async (id: string): Promise<void> => {
    if (!isAdmin) return;
    try {
      await deleteAttendanceLogDoc(id);
      notify('Catatan absensi dihapus.', 'info');
    } catch {
      notify('Gagal menghapus catatan absensi.', 'warning');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-50 via-teal-50/40 to-green-50 text-slate-900">
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
            graceMinutes={storeSettings.graceMinutes}
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
            className="max-w-md mx-auto mt-4 sm:mt-10 bg-white border border-emerald-200/80 rounded-2xl p-6 sm:p-8 shadow-sm shadow-emerald-950/5"
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
              className="w-full min-h-[44px] mt-3 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium text-slate-600 hover:text-emerald-950 hover:bg-emerald-50 transition-colors"
            >
              Kembali ke Halaman Absensi
            </button>
          </section>
        )}
      </main>

      <footer className="border-t border-emerald-200/80 bg-white/80 backdrop-blur-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600">
          <span>SIBS-Mart · Mini Market Pesantren Situwangi</span>
          <span>Data & pengaturan tersinkron otomatis lintas perangkat</span>
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
            employees={employeeItems}
            onClose={() => setIsEmployeeModalOpen(false)}
            onAddEmployee={handleAddEmployee}
            onRemoveEmployee={handleRemoveEmployee}
          />

          <ChangePinModal
            isOpen={isChangePinModalOpen}
            currentGraceMinutes={storeSettings.graceMinutes}
            onClose={() => setIsChangePinModalOpen(false)}
            onSaveSettings={handleSaveStoreSettings}
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
                  ? 'border-teal-200 text-slate-900'
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
                className="w-5 h-5 text-teal-700 shrink-0 mt-0.5"
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

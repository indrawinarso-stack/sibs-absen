import { FormEvent, useEffect, useRef, useState } from 'react';
import { Plus, Trash2, UserCheck, X } from 'lucide-react';
import { EmployeeItem } from '../types/attendance';

interface EmployeeModalProps {
  isOpen: boolean;
  employees: EmployeeItem[];
  onClose: () => void;
  onAddEmployee: (name: string) => Promise<{ ok: boolean; error?: string }>;
  onRemoveEmployee: (employee: EmployeeItem) => Promise<void>;
}

export function EmployeeModal({
  isOpen,
  employees,
  onClose,
  onAddEmployee,
  onRemoveEmployee,
}: EmployeeModalProps) {
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setNewName('');
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 60);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isBusy) return;
    setIsBusy(true);
    const result = await onAddEmployee(newName);
    setIsBusy(false);

    if (!result.ok) {
      setError(result.error ?? 'Nama tidak valid.');
      return;
    }
    setNewName('');
    setError(null);
  };

  const handleDelete = async (item: EmployeeItem) => {
    if (isBusy) return;
    setIsBusy(true);
    await onRemoveEmployee(item);
    setIsBusy(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-emerald-950/45 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="employee-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl border border-emerald-200 shadow-xl overflow-hidden flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-emerald-100 bg-emerald-50/40 flex items-center justify-between gap-4">
          <div>
            <h2
              id="employee-modal-title"
              className="text-base sm:text-lg font-bold text-emerald-950"
            >
              Kelola Daftar Karyawan
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Perubahan langsung tersinkron ke semua perangkat kasir
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-slate-500 hover:text-emerald-950 hover:bg-emerald-100/70 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            aria-label="Tutup jendela kelola karyawan"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5">
          <form onSubmit={handleSubmit} className="space-y-2">
            <label
              htmlFor="new-employee-name"
              className="block text-sm font-medium text-slate-700"
            >
              Tambah Karyawan Baru
            </label>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                id="new-employee-name"
                type="text"
                disabled={isBusy}
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Masukkan nama karyawan..."
                maxLength={40}
                className="flex-1 min-h-[44px] px-3.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
              />
              <button
                type="submit"
                disabled={isBusy}
                className="min-h-[44px] px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white text-sm font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>Tambah</span>
              </button>
            </div>
            {error && (
              <p className="text-xs font-medium text-red-600" role="alert">
                {error}
              </p>
            )}
          </form>

          <div>
            <div className="flex items-center justify-between text-xs font-medium text-slate-500 pb-2 border-b border-emerald-100">
              <span>Daftar Aktif</span>
              <span className="font-mono tabular-nums">
                {employees.length} orang
              </span>
            </div>

            {employees.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">
                Belum ada nama karyawan. Silakan tambahkan nama di atas.
              </div>
            ) : (
              <ul className="divide-y divide-emerald-100/70">
                {employees.map((item) => (
                  <li
                    key={item.id}
                    className="py-2 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                        <UserCheck className="w-4 h-4" aria-hidden="true" />
                      </span>
                      <span className="text-sm font-medium text-slate-900 truncate">
                        {item.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleDelete(item)}
                      className="min-h-[44px] min-w-[44px] px-2.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
                      aria-label={`Hapus ${item.name}`}
                      title={`Hapus ${item.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <p className="mt-3 text-xs text-slate-500 leading-relaxed">
              Menghapus nama hanya menghapus pilihan di dropdown tanpa menghapus
              riwayat absensi sebelumnya.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

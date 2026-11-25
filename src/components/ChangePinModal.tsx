import { FormEvent, useEffect, useRef, useState } from 'react';
import { Settings2, X } from 'lucide-react';

interface AdminSettingsModalProps {
  isOpen: boolean;
  currentGraceMinutes: number;
  onClose: () => void;
  onSaveSettings: (payload: {
    graceMinutes: number;
    currentPin?: string;
    newPin?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
}

export function ChangePinModal({
  isOpen,
  currentGraceMinutes,
  onClose,
  onSaveSettings,
}: AdminSettingsModalProps) {
  const [graceMinutes, setGraceMinutes] = useState<number>(currentGraceMinutes);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const graceRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setGraceMinutes(currentGraceMinutes);
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setError(null);

    const timer = window.setTimeout(() => {
      graceRef.current?.focus();
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
  }, [isOpen, currentGraceMinutes, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const wantsPinChange =
      currentPin.trim() !== '' ||
      newPin.trim() !== '' ||
      confirmPin.trim() !== '';

    if (wantsPinChange) {
      if (!currentPin.trim()) {
        setError('Masukkan PIN saat ini untuk mengganti PIN.');
        return;
      }
      if (newPin.trim().length < 4) {
        setError('PIN baru minimal 4 karakter.');
        return;
      }
      if (newPin.trim() !== confirmPin.trim()) {
        setError('Konfirmasi PIN baru tidak cocok.');
        return;
      }
    }

    if (Number.isNaN(graceMinutes) || graceMinutes < 0 || graceMinutes > 120) {
      setError('Toleransi keterlambatan harus antara 0 hingga 120 menit.');
      return;
    }

    setIsSaving(true);
    setError(null);
    const result = await onSaveSettings({
      graceMinutes,
      currentPin: wantsPinChange ? currentPin : undefined,
      newPin: wantsPinChange ? newPin : undefined,
    });
    setIsSaving(false);

    if (!result.ok) {
      setError(result.error ?? 'Gagal menyimpan pengaturan.');
      return;
    }

    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-emerald-950/45 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-settings-title"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl border border-emerald-200 shadow-xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-emerald-100 bg-emerald-50/40 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Settings2 className="w-5 h-5 text-emerald-700" aria-hidden="true" />
            <div>
              <h2
                id="admin-settings-title"
                className="text-base sm:text-lg font-bold text-emerald-950"
              >
                Pengaturan Toko & PIN Admin
              </h2>
              <p className="text-xs text-slate-600">
                Otomatis berlaku di semua perangkat karyawan
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-slate-500 hover:text-emerald-950 hover:bg-emerald-100/70 transition-colors"
            aria-label="Tutup pengaturan"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5 overflow-y-auto">
          <div className="space-y-1.5">
            <label
              htmlFor="grace-minutes-input"
              className="block text-sm font-semibold text-slate-800"
            >
              Toleransi Keterlambatan (menit)
            </label>
            <input
              ref={graceRef}
              id="grace-minutes-input"
              type="number"
              min={0}
              max={120}
              required
              value={graceMinutes}
              onChange={(e) => setGraceMinutes(Number(e.target.value))}
              className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 bg-white text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
            />
            <p className="text-xs text-slate-500">
              Batas waktu tepat waktu setelah jam masuk shift (default 15 menit).
            </p>
          </div>

          <div className="pt-4 border-t border-emerald-100 space-y-3.5">
            <div className="text-sm font-semibold text-emerald-950">
              Ubah PIN Admin <span className="font-normal text-slate-500">(Opsional)</span>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="current-admin-pin"
                className="block text-xs font-medium text-slate-700"
              >
                PIN Saat Ini
              </label>
              <input
                id="current-admin-pin"
                type="password"
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value)}
                placeholder="Kosongkan jika tidak mengubah PIN"
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 bg-white text-sm font-mono text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="new-admin-pin"
                className="block text-xs font-medium text-slate-700"
              >
                PIN Baru (minimal 4 karakter)
              </label>
              <input
                id="new-admin-pin"
                type="password"
                minLength={4}
                maxLength={24}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="Masukkan PIN baru"
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 bg-white text-sm font-mono text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="confirm-admin-pin"
                className="block text-xs font-medium text-slate-700"
              >
                Ulangi PIN Baru
              </label>
              <input
                id="confirm-admin-pin"
                type="password"
                minLength={4}
                maxLength={24}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="Ketik ulang PIN baru"
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 bg-white text-sm font-mono text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs font-medium text-red-600" role="alert">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="min-h-[44px] px-5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white text-sm font-semibold"
            >
              {isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

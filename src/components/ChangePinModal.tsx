import { FormEvent, useEffect, useRef, useState } from 'react';
import { KeyRound, X } from 'lucide-react';

interface ChangePinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChangePin: (
    currentPin: string,
    newPin: string
  ) => Promise<{ ok: boolean; error?: string }>;
}

export function ChangePinModal({
  isOpen,
  onClose,
  onChangePin,
}: ChangePinModalProps) {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const currentRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setError(null);

    const timer = window.setTimeout(() => {
      currentRef.current?.focus();
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
    if (newPin.trim() !== confirmPin.trim()) {
      setError('Konfirmasi PIN baru tidak cocok.');
      return;
    }

    setIsSaving(true);
    setError(null);
    const result = await onChangePin(currentPin, newPin);
    setIsSaving(false);

    if (!result.ok) {
      setError(result.error ?? 'Gagal mengubah PIN.');
      return;
    }

    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-pin-title"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <KeyRound className="w-5 h-5 text-blue-700" aria-hidden="true" />
            <h2
              id="change-pin-title"
              className="text-base sm:text-lg font-bold text-slate-900"
            >
              Ubah PIN Admin
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label="Tutup modal ubah PIN"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="current-admin-pin"
              className="block text-sm font-medium text-slate-700"
            >
              PIN Saat Ini
            </label>
            <input
              ref={currentRef}
              id="current-admin-pin"
              type="password"
              required
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value)}
              placeholder="Masukkan PIN saat ini"
              className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 bg-white text-sm font-mono text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="new-admin-pin"
              className="block text-sm font-medium text-slate-700"
            >
              PIN Baru (minimal 4 karakter)
            </label>
            <input
              id="new-admin-pin"
              type="password"
              required
              minLength={4}
              maxLength={24}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              placeholder="Masukkan PIN baru"
              className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 bg-white text-sm font-mono text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="confirm-admin-pin"
              className="block text-sm font-medium text-slate-700"
            >
              Ulangi PIN Baru
            </label>
            <input
              id="confirm-admin-pin"
              type="password"
              required
              minLength={4}
              maxLength={24}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              placeholder="Ketik ulang PIN baru"
              className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 bg-white text-sm font-mono text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
            />
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
              className="min-h-[44px] px-5 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 text-white text-sm font-semibold"
            >
              {isSaving ? 'Menyimpan...' : 'Simpan PIN Baru'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

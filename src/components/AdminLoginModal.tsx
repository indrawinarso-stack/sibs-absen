import { FormEvent, useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, Lock, ShieldCheck, X } from 'lucide-react';

interface AdminLoginFormProps {
  onSubmitPin: (pin: string) => Promise<boolean>;
  title?: string;
  subtitle?: string;
  submitLabel?: string;
}

export function AdminLoginForm({
  onSubmitPin,
  title = 'Akses Khusus Admin',
  subtitle = 'Masukkan PIN Admin SIBS-Mart untuk membuka laporan kehadiran dan ekspor data.',
  submitLabel = 'Masuk sebagai Admin',
}: AdminLoginFormProps) {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 60);
    return () => window.clearTimeout(timer);
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!pin.trim()) {
      setError('Masukkan PIN Admin terlebih dahulu.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    const ok = await onSubmitPin(pin);
    setIsSubmitting(false);

    if (!ok) {
      setError('PIN Admin salah. Silakan coba lagi.');
      setPin('');
      inputRef.current?.focus();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 flex items-center justify-center shrink-0">
          <Lock className="w-5 h-5" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 leading-relaxed">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="admin-pin-input"
          className="block text-sm font-semibold text-slate-800"
        >
          PIN Admin
        </label>
        <div className="relative">
          <input
            ref={inputRef}
            id="admin-pin-input"
            type={showPin ? 'text' : 'password'}
            autoComplete="current-password"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Masukkan PIN Admin..."
            className="w-full min-h-[48px] pl-4 pr-12 rounded-xl border border-slate-300 bg-white text-base font-mono tracking-wider text-slate-900 placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
          />
          <button
            type="button"
            onClick={() => setShowPin((prev) => !prev)}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 min-h-[40px] min-w-[40px] rounded-lg text-slate-400 hover:text-slate-700 flex items-center justify-center"
            aria-label={showPin ? 'Sembunyikan PIN' : 'Tampilkan PIN'}
          >
            {showPin ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
        {error && (
          <p className="text-xs font-medium text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
      >
        <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
        <span>{isSubmitting ? 'Memeriksa...' : submitLabel}</span>
      </button>
    </form>
  );
}

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitPin: (pin: string) => Promise<boolean>;
  purposeLabel?: string;
}

export function AdminLoginModal({
  isOpen,
  onClose,
  onSubmitPin,
  purposeLabel,
}: AdminLoginModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Login Admin SIBS-Mart"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-xl p-5 sm:p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 min-h-[40px] min-w-[40px] rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          aria-label="Tutup login admin"
        >
          <X className="w-5 h-5" />
        </button>

        <AdminLoginForm
          onSubmitPin={onSubmitPin}
          subtitle={
            purposeLabel ??
            'Masukkan PIN Admin SIBS-Mart untuk mengakses laporan dan pengaturan karyawan.'
          }
        />
      </div>
    </div>
  );
}

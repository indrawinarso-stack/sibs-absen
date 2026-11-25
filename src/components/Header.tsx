import { useState } from 'react';
import {
  ClipboardCheck,
  Lock,
  ShieldCheck,
  TableProperties,
} from 'lucide-react';
import { AppTab } from '../types/attendance';
import { SIBS_LOGO_PATH } from '../utils/attendance';

interface HeaderProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  isAdmin: boolean;
  onRequestAdminLogin: () => void;
  onLogoutAdmin: () => void;
  todayLogCount: number;
}

export function Header({
  activeTab,
  onTabChange,
  isAdmin,
  onRequestAdminLogin,
  onLogoutAdmin,
  todayLogCount,
}: HeaderProps) {
  const [logoError, setLogoError] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-emerald-200/80 shadow-xs shadow-emerald-950/5">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3 sm:gap-8">
        {/* Zone 1: Brand wordmark + proportional logo */}
        <button
          type="button"
          onClick={() => onTabChange('absensi')}
          className="flex items-center gap-2.5 text-left shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded-lg py-1"
        >
          {!logoError ? (
            <img
              src={SIBS_LOGO_PATH}
              alt="Logo SIBS-Mart"
              referrerPolicy="no-referrer"
              onError={() => setLogoError(true)}
              className="h-9 w-9 sm:h-10 sm:w-10 object-contain rounded-lg border border-emerald-100 bg-white shrink-0"
            />
          ) : (
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-emerald-700 text-white font-display font-bold text-sm flex items-center justify-center shrink-0">
              SM
            </div>
          )}
          <span className="font-display font-bold text-base sm:text-lg tracking-tight text-emerald-950 whitespace-nowrap shrink-0">
            SIBS-Mart
          </span>
        </button>

        {/* Zone 2: Navigation tabs */}
        <nav
          aria-label="Navigasi utama"
          className="flex items-center bg-emerald-50/90 border border-emerald-200/70 p-1 rounded-xl shrink-0"
        >
          <button
            type="button"
            onClick={() => onTabChange('absensi')}
            className={`min-h-[40px] px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
              activeTab === 'absensi'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'text-emerald-900/70 hover:text-emerald-950'
            }`}
          >
            <ClipboardCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Absensi</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('log')}
            className={`min-h-[40px] px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
              activeTab === 'log'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'text-emerald-900/70 hover:text-emerald-950'
            }`}
          >
            {isAdmin ? (
              <TableProperties
                className="w-4 h-4 shrink-0"
                aria-hidden="true"
              />
            ) : (
              <Lock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            )}
            <span>Laporan</span>
            {isAdmin && todayLogCount > 0 && (
              <span
                className={`font-mono tabular-nums text-[11px] ${
                  activeTab === 'log' ? 'text-emerald-100' : 'text-emerald-700'
                }`}
              >
                ({todayLogCount})
              </span>
            )}
          </button>
        </nav>

        {/* Zone 3: Admin Session Control */}
        <div className="flex items-center shrink-0">
          {isAdmin ? (
            <button
              type="button"
              onClick={onLogoutAdmin}
              className="min-h-[44px] px-3 sm:px-4 py-2 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-950 text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
              aria-label="Kunci akses admin"
            >
              <Lock className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">Kunci Admin</span>
              <span className="sm:hidden">Kunci</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onRequestAdminLogin}
              className="min-h-[44px] px-3 sm:px-4 py-2 rounded-xl border border-emerald-200 bg-white hover:bg-emerald-50 hover:border-emerald-300 text-emerald-900 text-xs sm:text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
              aria-label="Masuk sebagai Admin"
            >
              <ShieldCheck
                className="w-4 h-4 text-emerald-700 shrink-0"
                aria-hidden="true"
              />
              <span className="hidden sm:inline">Masuk Admin</span>
              <span className="sm:hidden">Admin</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

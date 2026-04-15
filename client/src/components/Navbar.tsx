import { NotificationsBell } from "./NotificationsBell";
import { getApiBaseUrl } from "../api/http";

interface NavbarProps {
  onAddAccount: () => void;
  onAvatarClick: () => void;
}

export function Navbar({ onAddAccount, onAvatarClick }: NavbarProps) {
  const apiBaseUrl = getApiBaseUrl();

  return (
    <header className="sticky top-0 z-30 border-b border-white/8 bg-slate-950/80 backdrop-blur-xl">
      <div className="flex h-20 items-center justify-between gap-4 px-5 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 via-sky-500 to-cyan-400 text-lg font-black text-white shadow-lg shadow-blue-500/25">
            PV
          </div>
          <div>
            <p className="text-sm font-semibold tracking-[0.24em] text-sky-300 uppercase">PhotoVault</p>
            <p className="text-xs text-slate-400">Unified multi-account photo control</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={`${apiBaseUrl}/auth/google/add-account`}
            onClick={onAddAccount}
            className="hidden rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 sm:inline-flex"
          >
            Add Account
          </a>
          <NotificationsBell />
          <button
            type="button"
            onClick={onAvatarClick}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-white/20 to-white/5 text-sm font-semibold text-white"
            aria-label="User avatar"
          >
            PV
          </button>
        </div>
      </div>
    </header>
  );
}

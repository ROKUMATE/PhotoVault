import { useEffect } from "react";
import toast from "react-hot-toast";
import { Navbar } from "./Navbar";
import { StorageSidebar } from "./StorageSidebar";
import { UnifiedPhotoTimeline } from "./UnifiedPhotoTimeline";
import { UploadFab } from "./UploadFab";
import { getApiBaseUrl } from "../api/http";

interface DashboardPageProps {
  onAddAccount: () => void;
  onAvatarClick: () => void;
}

export function DashboardPage({ onAddAccount, onAvatarClick }: DashboardPageProps) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("added") === "1" || params.get("accountAdded") === "1") {
      toast.success("Account added!");
      params.delete("added");
      params.delete("accountAdded");
      const nextSearch = params.toString();
      const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`;
      window.history.replaceState({}, document.title, nextUrl);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <Navbar onAddAccount={onAddAccount} onAvatarClick={onAvatarClick} />

      <div className="mx-auto flex w-full max-w-[1600px] gap-6 px-4 py-6 lg:px-6">
        <div className="hidden w-[340px] shrink-0 lg:block">
          <div className="sticky top-28">
            <StorageSidebar />
          </div>
        </div>

        <main className="min-w-0 flex-1">
          <div className="mb-6 rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.18)] backdrop-blur-xl lg:hidden">
            <StorageSidebar />
          </div>

          <div className="mb-6 rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(66,133,244,0.18),_transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.18)] backdrop-blur-xl">
            <p className="text-xs font-semibold tracking-[0.22em] text-sky-200 uppercase">Unified Timeline</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">All your photos in one place</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Scroll to load more. Photos are fetched from your local PhotoVault cache, while thumbnails are proxied through the backend.
            </p>
            <p className="mt-3 text-xs text-slate-400">API base: {getApiBaseUrl()}</p>
          </div>

          <UnifiedPhotoTimeline />
        </main>
      </div>

      <UploadFab />
    </div>
  );
}

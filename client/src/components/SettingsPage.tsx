import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { disconnectAccount, fetchConnectedAccounts } from "../api/photoVaultApi";
import { Navbar } from "./Navbar";
import { getAccountColor } from "../utils/accountColors";
import { useGooglePicker } from "../hooks/useGooglePicker";

interface SettingsPageProps {
  onAddAccount: () => void;
  onAvatarClick: () => void;
  onOpenDashboard: () => void;
}

export function SettingsPage({ onAddAccount, onAvatarClick, onOpenDashboard }: SettingsPageProps) {
  const queryClient = useQueryClient();

  const accountsQuery = useQuery({
    queryKey: ["connected-accounts"],
    queryFn: fetchConnectedAccounts,
  });

  const disconnectMutation = useMutation({
    mutationFn: disconnectAccount,
    onSuccess: (response) => {
      toast.success(response.message);
      void queryClient.invalidateQueries({ queryKey: ["connected-accounts"] });
      void queryClient.invalidateQueries({ queryKey: ["storage-summary"] });
      void queryClient.invalidateQueries({ queryKey: ["photos"] });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Failed to disconnect account";
      toast.error(message);
    },
  });

  const accounts = accountsQuery.data?.accounts ?? [];
  const { loadPicker, isLoading: isPickerLoading } = useGooglePicker();

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <Navbar
        onAddAccount={onAddAccount}
        onAvatarClick={onAvatarClick}
        onOpenSettings={() => {}}
        onOpenDashboard={onOpenDashboard}
        currentView="settings"
      />

      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(0,188,212,0.2),_transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.18)] backdrop-blur-xl">
          <p className="text-xs font-semibold tracking-[0.22em] text-cyan-200 uppercase">Settings</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Connected Accounts</h1>
          <p className="mt-2 text-sm text-slate-300">
            Manage all linked Google accounts, monitor storage usage, and disconnect accounts you no longer need.
          </p>

          <button
            type="button"
            onClick={onAddAccount}
            className="mt-5 inline-flex rounded-2xl border border-white/10 bg-white/6 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/12"
          >
            Add another account
          </button>
        </div>

        {accountsQuery.isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-28 animate-pulse rounded-3xl bg-white/8" />
            ))}
          </div>
        ) : null}

        {!accountsQuery.isLoading && accounts.length === 0 ? (
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-10 text-center text-slate-300">
            No connected accounts yet.
          </div>
        ) : null}

        <div className="space-y-4">
          {accounts.map((account, index) => {
            const color = getAccountColor(index);
            return (
              <section
                key={account.id}
                className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.18)] backdrop-blur-xl"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: color }} />
                    <p className="font-medium text-white">{account.email}</p>
                  </div>

                  
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => loadPicker(account.id, () => queryClient.invalidateQueries({ queryKey: ["photos"] }))}
                      disabled={isPickerLoading}
                      className="rounded-xl border border-sky-300/35 bg-sky-500/12 px-3 py-2 text-xs font-semibold text-sky-200 transition hover:bg-sky-500/22 disabled:opacity-60"
                    >
                      Import Historical Photos
                    </button>
                    <button
                      type="button"
                      onClick={() => disconnectMutation.mutate(account.id)}
                      disabled={disconnectMutation.isPending}
                      className="rounded-xl border border-rose-300/35 bg-rose-500/12 px-3 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/22 disabled:opacity-60"
                    >
                      Disconnect
                    </button>
                  </div>

                </div>

                <p className="mb-3 text-xs text-slate-400">
                  {account.usedGB.toFixed(2)} / {account.totalGB.toFixed(2)} GB used
                </p>

                <div className="h-2 rounded-full bg-white/10">
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(account.percentUsed, 100)}%`, backgroundColor: color }}
                  />
                </div>

                <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                  <span>{account.percentUsed.toFixed(1)}% used</span>
                  <span>{account.freeGB.toFixed(2)} GB free</span>
                </div>
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}

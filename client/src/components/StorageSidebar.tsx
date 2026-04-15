import { useQuery } from "@tanstack/react-query";
import { fetchStorageSummary } from "../api/photoVaultApi";
import { getAccountColor } from "../utils/accountColors";

export function StorageSidebar() {
  const summaryQuery = useQuery({
    queryKey: ["storage-summary"],
    queryFn: fetchStorageSummary,
    refetchInterval: 60_000,
  });

  if (summaryQuery.isLoading) {
    return (
      <aside className="rounded-[28px] border border-white/10 bg-white/5 p-5">
        <div className="h-6 w-40 animate-pulse rounded-full bg-white/10" />
        <div className="mt-5 space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <div className="h-4 w-44 animate-pulse rounded-full bg-white/10" />
              <div className="h-2.5 animate-pulse rounded-full bg-white/10" />
            </div>
          ))}
        </div>
      </aside>
    );
  }

  const data = summaryQuery.data;
  const accounts = data?.accounts ?? [];
  const combined = data?.combined;

  return (
    <aside className="rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.2)] backdrop-blur-xl">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Storage Summary</h2>
          <p className="text-sm text-slate-400">All connected Google accounts</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300">
          {accounts.length} accounts
        </div>
      </div>

      <div className="space-y-4">
        {accounts.map((account, index) => {
          const color = getAccountColor(index);
          return (
            <div key={account.accountId} className="space-y-2 rounded-2xl border border-white/8 bg-slate-950/40 p-3">
              <div className="flex items-center justify-between gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: color }} />
                  <span className="truncate font-medium text-white">{account.email}</span>
                </div>
                <span className="shrink-0 text-slate-400">
                  {account.usedGB.toFixed(2)} / {account.totalGB.toFixed(2)} GB
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/10">
                <div
                  className="h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(account.percentUsed, 100)}%`, backgroundColor: color }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{account.percentUsed.toFixed(1)}% used</span>
                <span>{account.freeGB.toFixed(2)} GB free</span>
              </div>
            </div>
          );
        })}
      </div>

      {combined ? (
        <div className="mt-5 rounded-2xl border border-sky-400/20 bg-sky-400/10 p-4">
          <div className="flex items-center justify-between text-sm text-white">
            <span className="font-semibold">Combined Total</span>
            <span>
              {combined.usedGB.toFixed(2)} / {combined.totalGB.toFixed(2)} GB
            </span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-white/10">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500"
              style={{ width: `${Math.min(combined.percentUsed, 100)}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-sky-100/80">
            <span>{combined.percentUsed.toFixed(1)}% used</span>
            <span>{combined.freeGB.toFixed(2)} GB free</span>
          </div>
        </div>
      ) : null}
    </aside>
  );
}

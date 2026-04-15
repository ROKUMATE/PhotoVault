import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchNotifications } from "../api/photoVaultApi";
import { formatShortDateTime } from "../utils/format";

export function NotificationsBell() {
  const [isOpen, setIsOpen] = useState(false);
  const notificationsQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
    refetchInterval: 60_000,
  });

  const notifications = notificationsQuery.data?.notifications ?? [];
  const count = notificationsQuery.data?.count ?? 0;

  const content = useMemo(() => {
    if (notificationsQuery.isLoading) {
      return <div className="p-4 text-sm text-slate-400">Loading notifications...</div>;
    }

    if (notifications.length === 0) {
      return <div className="p-4 text-sm text-slate-400">No new alerts.</div>;
    }

    return (
      <div className="max-h-80 overflow-auto py-2">
        {notifications.map((notification) => (
          <div key={notification.id} className="border-b border-white/8 px-4 py-3 last:border-b-0">
            <p className="text-sm text-white">{notification.message}</p>
            <p className="mt-1 text-xs text-slate-400">{formatShortDateTime(notification.createdAt)}</p>
          </div>
        ))}
      </div>
    );
  }, [notifications, notificationsQuery.isLoading]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
        aria-label="Notifications"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
          <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 0 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
          <path d="M9 17a3 3 0 0 0 6 0" />
        </svg>
        {count > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            {count}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="absolute right-0 z-50 mt-3 w-80 overflow-hidden rounded-3xl border border-white/10 bg-slate-950/95 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="border-b border-white/8 px-4 py-3">
            <p className="text-sm font-semibold text-white">Notifications</p>
            <p className="text-xs text-slate-400">Storage warnings and system alerts.</p>
          </div>
          {content}
        </div>
      ) : null}
    </div>
  );
}

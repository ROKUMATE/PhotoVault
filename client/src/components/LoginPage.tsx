import { getApiBaseUrl } from "../api/http";

export function LoginPage() {
  const apiBaseUrl = getApiBaseUrl();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(66,133,244,0.28),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(234,67,53,0.18),_transparent_24%),linear-gradient(180deg,#08111f_0%,#04070d_100%)] px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md items-center justify-center">
        <div className="w-full rounded-[28px] border border-white/10 bg-white/8 p-8 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 via-sky-500 to-cyan-400 text-2xl font-black text-white shadow-lg shadow-blue-500/30">
              PV
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">PhotoVault</h1>
            <p className="mt-2 text-sm text-slate-300">
              Connect multiple Google Photos accounts and manage them from one unified timeline.
            </p>
          </div>

          <a
            href={`${apiBaseUrl}/auth/google`}
            className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-5 py-3.5 text-sm font-semibold text-slate-950 transition hover:translate-y-[-1px] hover:bg-slate-100"
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-950 text-[11px] text-white">G</span>
            Sign in with Google
          </a>

          <p className="mt-5 text-center text-xs leading-5 text-slate-400">
            Unified multi-account Google Photos management with smart uploads and storage alerts.
          </p>
        </div>
      </div>
    </div>
  );
}

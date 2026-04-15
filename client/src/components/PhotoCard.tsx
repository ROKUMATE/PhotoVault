import { PhotoThumbnail } from "./PhotoThumbnail";
import type { GalleryPhoto } from "../api/types";
import { formatShortDateTime } from "../utils/format";

interface PhotoCardProps {
  photo: GalleryPhoto;
}

export function PhotoCard({ photo }: PhotoCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-[24px] border border-white/10 bg-slate-900/70 shadow-[0_20px_60px_rgba(0,0,0,0.25)] transition hover:-translate-y-1 hover:border-white/20">
      <div className="relative aspect-[4/5] overflow-hidden">
        <PhotoThumbnail photoId={photo.id} alt={photo.filename} />
        <div className="absolute right-3 top-3 h-3.5 w-3.5 rounded-full border border-white/70 shadow-[0_0_0_4px_rgba(0,0,0,0.2)]" style={{ backgroundColor: photo.accountColor }} />
        <div className="pointer-events-none absolute inset-x-3 bottom-3 rounded-2xl bg-slate-950/85 px-3 py-2 opacity-0 shadow-lg transition group-hover:opacity-100">
          <p className="truncate text-sm font-medium text-white">{photo.filename}</p>
          <p className="truncate text-xs text-slate-300">{photo.googleAccountEmail}</p>
        </div>
      </div>
      <div className="border-t border-white/8 px-3 py-2.5 text-xs text-slate-400">
        <div className="flex items-center justify-between gap-3">
          <span className="truncate text-white/90">{photo.filename}</span>
          <span className="shrink-0">{formatShortDateTime(photo.takenAt)}</span>
        </div>
      </div>
    </div>
  );
}

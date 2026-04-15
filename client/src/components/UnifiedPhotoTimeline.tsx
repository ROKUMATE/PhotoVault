import { useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchGalleryPage } from "../api/photoVaultApi";
import type { GalleryPhoto, PhotoGroup } from "../api/types";
import { PhotoCard } from "./PhotoCard";
import { formatDateLabel } from "../utils/format";
import { useElementInView } from "../hooks/useElementInView";

function mergeGroups(pages: PhotoGroup[][]): PhotoGroup[] {
  const merged = new Map<string, GalleryPhoto[]>();

  for (const groups of pages) {
    for (const group of groups) {
      const existing = merged.get(group.date) ?? [];
      merged.set(group.date, [...existing, ...group.photos]);
    }
  }

  return Array.from(merged.entries())
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([date, photos]) => ({ date, photos }));
}

export function UnifiedPhotoTimeline() {
  const { ref, isInView } = useElementInView<HTMLDivElement>();

  const galleryQuery = useInfiniteQuery({
    queryKey: ["photos"],
    queryFn: ({ pageParam }) => fetchGalleryPage(pageParam as string | null | undefined, 50),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  const groupedPhotos = useMemo(() => {
    return mergeGroups(galleryQuery.data?.pages.map((page) => page.groups) ?? []);
  }, [galleryQuery.data?.pages]);

  if (galleryQuery.isLoading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, sectionIndex) => (
          <div key={sectionIndex} className="space-y-4">
            <div className="h-5 w-48 animate-pulse rounded-full bg-white/10" />
            <div className="grid grid-cols-3 gap-3 lg:grid-cols-5">
              {Array.from({ length: 10 }).map((__, cardIndex) => (
                <div key={cardIndex} className="aspect-[4/5] animate-pulse rounded-[24px] bg-white/8" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (galleryQuery.isError) {
    return (
      <div className="rounded-[28px] border border-rose-400/20 bg-rose-400/10 p-6 text-rose-100">
        Failed to load photo timeline.
      </div>
    );
  }

  if (groupedPhotos.length === 0) {
    return (
      <div className="rounded-[28px] border border-white/10 bg-white/5 p-10 text-center text-slate-300">
        No photos synced yet.
      </div>
    );
  }

  if (isInView && galleryQuery.hasNextPage && !galleryQuery.isFetchingNextPage) {
    void galleryQuery.fetchNextPage();
  }

  return (
    <div className="space-y-10">
      {groupedPhotos.map((group) => (
        <section key={group.date} className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            <h3 className="text-sm font-semibold tracking-[0.16em] text-sky-200 uppercase">{formatDateLabel(group.date)}</h3>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </div>
          <div className="grid grid-cols-3 gap-3 lg:grid-cols-5">
            {group.photos.map((photo) => (
              <PhotoCard key={photo.id} photo={photo} />
            ))}
          </div>
        </section>
      ))}

      <div ref={ref} className="flex justify-center py-8 text-sm text-slate-400">
        {galleryQuery.isFetchingNextPage ? "Loading more photos..." : galleryQuery.hasNextPage ? "Scroll to load more" : "You've reached the end"}
      </div>
    </div>
  );
}

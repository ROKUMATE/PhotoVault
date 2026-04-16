import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchThumbnailBlob } from "../api/photoVaultApi";
import { useElementInView } from "../hooks/useElementInView";

interface PhotoThumbnailProps {
  photoId: string;
  alt: string;
}

export function PhotoThumbnail({ photoId, alt }: PhotoThumbnailProps) {
  const { ref, isInView } = useElementInView<HTMLDivElement>();
  const [thumbnailSrc, setThumbnailSrc] = useState<string | null>(null);

  const thumbnailQuery = useQuery({
    queryKey: ["thumbnail", photoId],
    queryFn: () => fetchThumbnailBlob(photoId),
    enabled: isInView,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

  useEffect(() => {
    if (!thumbnailQuery.data) {
      return;
    }

    const objectUrl = URL.createObjectURL(thumbnailQuery.data);
    setThumbnailSrc(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [thumbnailQuery.data]);

  return (
    <div ref={ref} className="relative h-full w-full overflow-hidden bg-slate-900">
      {thumbnailSrc ? (
        <img src={thumbnailSrc} alt={alt} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" loading="lazy" />
      ) : (
        <div className="h-full w-full animate-pulse bg-slate-700/55" />
      )}
      {thumbnailQuery.isError ? (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 text-xs text-white">Thumbnail unavailable</div>
      ) : null}
    </div>
  );
}

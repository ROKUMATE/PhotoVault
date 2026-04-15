import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { uploadPhoto } from "../api/photoVaultApi";

export function UploadFab() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [progress, setProgress] = useState(0);
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => uploadPhoto(file, setProgress),
    onSuccess: (response) => {
      toast.success(response.message);
      void queryClient.invalidateQueries({ queryKey: ["photos"] });
      void queryClient.invalidateQueries({ queryKey: ["storage-summary"] });
      setProgress(0);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Upload failed";
      toast.error(message);
      setProgress(0);
    },
  });

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
      {uploadMutation.isPending ? (
        <div className="w-72 rounded-2xl border border-white/10 bg-slate-950/90 p-3 shadow-[0_16px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="mb-2 flex items-center justify-between text-xs text-slate-300">
            <span>Uploading...</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/10">
            <div className="h-2 rounded-full bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 text-3xl font-light text-white shadow-[0_20px_70px_rgba(37,99,235,0.45)] transition hover:scale-105"
        aria-label="Upload photo"
      >
        +
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            uploadMutation.mutate(file);
          }
          event.target.value = "";
        }}
      />
    </div>
  );
}

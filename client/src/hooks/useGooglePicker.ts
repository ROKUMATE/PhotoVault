import { useCallback, useState } from "react";
import { fetchPickerAuth, importPickedPhotos } from "../api/photoVaultApi";
import toast from "react-hot-toast";

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

export function useGooglePicker() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const loadPicker = useCallback(async (accountId: string, onSuccess?: (count: number) => void) => {
    setIsLoading(true);
    try {
      if (!window.gapi) {
        throw new Error("Google APIs not loaded. Please wait and try again.");
      }

      await new Promise<void>((resolve) => {
        window.gapi.load("picker", resolve);
      });

      const authData = await fetchPickerAuth(accountId);
      
      const showPicker = () => {
        const pickerBuilder = new window.google.picker.PickerBuilder()
          .addView(window.google.picker.ViewId.PHOTOS)
          .setOAuthToken(authData.accessToken)
          .setDeveloperKey(authData.apiKey)
          .setCallback(async (data: any) => {
            if (data[window.google.picker.Response.ACTION] === window.google.picker.Action.PICKED) {
              const docs = data[window.google.picker.Response.DOCUMENTS];
              let toastId;
              try {
                toastId = toast.loading(`Importing ${docs.length} photos...`);
                // We pass raw documents which contain the media URLs/IDs to our backend
                const result = await importPickedPhotos(accountId, docs);
                toast.success(`Imported ${result.imported} photos successfully!`, { id: toastId });
                if (onSuccess) onSuccess(result.imported);
              } catch (err: any) {
                toast.error("Failed to import photos: " + (err.response?.data?.error || err.message), { id: toastId });
              }
            } else if (data[window.google.picker.Response.ACTION] === window.google.picker.Action.CANCEL) {
              setIsOpen(false);
            }
          });
          
        if (authData.appId) {
            pickerBuilder.setAppId(authData.appId);
        }
        
        const picker = pickerBuilder.build();
        picker.setVisible(true);
        setIsOpen(true);
      };

      showPicker();

    } catch (err: any) {
      toast.error(err.message || "Failed to load Google Picker");
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { loadPicker, isOpen, isLoading };
}

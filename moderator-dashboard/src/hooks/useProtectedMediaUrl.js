import React from "react";
import { STORAGE_KEYS } from "../constants/storageKeys";

export function useProtectedMediaUrl(url) {
  const [mediaUrl, setMediaUrl] = React.useState(null);
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    if (!url) {
      setMediaUrl(null);
      setHasError(false);
      return undefined;
    }

    let isActive = true;
    let objectUrl = null;
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);

    setMediaUrl(null);
    setHasError(false);

    fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Media request failed");
        }
        return response.blob();
      })
      .then((blob) => {
        if (!isActive) return;
        objectUrl = URL.createObjectURL(blob);
        setMediaUrl(objectUrl);
      })
      .catch(() => {
        if (isActive) {
          setMediaUrl(null);
          setHasError(true);
        }
      });

    return () => {
      isActive = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [url]);

  return { mediaUrl, hasError };
}

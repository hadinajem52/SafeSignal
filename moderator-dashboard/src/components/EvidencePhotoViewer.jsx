import React from "react";
import { X } from "lucide-react";

function EvidencePhotoViewer({ photo, onClose }) {
  React.useEffect(() => {
    if (!photo) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, photo]);

  if (!photo) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={photo.alt}
      onClick={onClose}
    >
      <div className="relative flex max-h-full max-w-6xl items-center justify-center">
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-12 right-0 inline-flex size-10 items-center justify-center border border-white/30 bg-black/40 text-white transition-colors hover:bg-white/10"
          aria-label="Close fullscreen evidence photo"
        >
          <X size={18} />
        </button>
        <img
          src={photo.src}
          alt={photo.alt}
          className="max-h-[86dvh] max-w-[92vw] object-contain"
          onClick={(event) => event.stopPropagation()}
        />
      </div>
    </div>
  );
}

export default EvidencePhotoViewer;

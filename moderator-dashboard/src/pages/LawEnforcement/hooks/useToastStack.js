import { useCallback, useEffect, useRef, useState } from "react";

export default function useToastStack() {
  const [toasts, setToasts] = useState([]);
  const toastTimeoutsRef = useRef([]);

  useEffect(() => {
    const timeouts = toastTimeoutsRef.current;
    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, []);

  const pushToast = useCallback((message, type = "success") => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    const duration = type === "error" ? 5000 : 3200;
    const tid = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      toastTimeoutsRef.current = toastTimeoutsRef.current.filter(
        (timeoutId) => timeoutId !== tid,
      );
    }, duration);
    toastTimeoutsRef.current.push(tid);
  }, []);

  return { toasts, pushToast };
}

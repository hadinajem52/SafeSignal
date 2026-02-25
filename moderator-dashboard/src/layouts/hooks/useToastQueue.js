import { useCallback, useEffect, useRef, useState } from "react";

export function useToastQueue() {
  const [notifications, setNotifications] = useState([]);
  const timeoutRefs = useRef({});

  const pushNotification = useCallback((message, type = "info") => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setNotifications((prev) => [{ id, message, type }, ...prev].slice(0, 8));
    timeoutRefs.current[id] = setTimeout(() => {
      setNotifications((prev) => prev.filter((item) => item.id !== id));
      delete timeoutRefs.current[id];
    }, 6000);
  }, []);

  useEffect(() => {
    return () => {
      Object.values(timeoutRefs.current).forEach(clearTimeout);
      timeoutRefs.current = {};
    };
  }, []);

  return {
    notifications,
    pushNotification,
  };
}

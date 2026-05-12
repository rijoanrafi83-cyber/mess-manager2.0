// src/hooks/useToast.js
import { useState, useCallback } from "react";

let _counter = 0;

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((msg, type = "success") => {
    const id = ++_counter;
    setToasts((p) => [...p, { id, msg, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
  }, []);

  return { toasts, push };
}
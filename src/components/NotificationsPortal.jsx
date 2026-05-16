import { createPortal } from "react-dom";

export function NotificationsPortal({ children }) {
  if (typeof document === "undefined") {
    return null;
  }

  const el = document.getElementById("notification-root");
  if (!el) {
    console.warn("Missing #notification-root element for portal.");
    return null;
  }

  return createPortal(children, el);
}

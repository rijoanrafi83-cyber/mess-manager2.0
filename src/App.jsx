import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { LoginPage }          from "./pages/auth/LoginPage";
import { RegisterPage }       from "./pages/auth/RegisterPage";
import { ForgotPasswordPage } from "./pages/auth/ForgotPasswordPage";
import { UnauthorizedPage }   from "./pages/auth/UnauthorizedPage";
import { AppShell }           from "./components/AppShell";

function PWAManifest() {
  useEffect(() => {
    if (document.querySelector('link[rel="manifest"]')) return;
    const manifest = {
      name: "MessManager",
      short_name: "MessManager",
      description: "Premium mess management system",
      start_url: "/",
      display: "standalone",
      background_color: "#0a0f1e",
      theme_color: "#7c3aed",
      icons: [{
        src: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><text y='52' font-size='52'>☕</text></svg>",
        sizes: "64x64",
        type: "image/svg+xml",
      }],
    };
    const blob = new Blob([JSON.stringify(manifest)], { type: "application/json" });
    const link = Object.assign(document.createElement("link"), {
      rel: "manifest",
      href: URL.createObjectURL(blob),
    });
    document.head.appendChild(link);
  }, []);
  return null;
}

function AppWithTheme() {
  const { dark } = useTheme();
  return (
    <div className={dark ? "dark" : ""}>
      <PWAManifest />
      <BrowserRouter>
        <Routes>
          <Route path="/login"           element={<LoginPage />} />
          <Route path="/register"        element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/unauthorized"    element={<UnauthorizedPage />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute allowedRoles={["admin", "member"]}>
                <AppShell />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppWithTheme />
      </AuthProvider>
    </ThemeProvider>
  );
}
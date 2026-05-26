import {
  useEffect
} from "react";

import {
  BrowserRouter,
  Routes,
  Route
} from "react-router-dom";

import {
  ThemeProvider
} from "./context/ThemeContext";

import {
  AuthProvider
} from "./context/AuthContext";

import {
  ProtectedRoute
} from "./components/auth/ProtectedRoute";

import {
  LoginPage
} from "./pages/auth/LoginPage";

import {
  RoleLoginPage
} from "./pages/auth/RoleLoginPage";

import {
  RegisterPage
} from "./pages/auth/RegisterPage";

import {
  ForgotPasswordPage
} from "./pages/auth/ForgotPasswordPage";

import {
  UnauthorizedPage
} from "./pages/auth/UnauthorizedPage";

import {
  AppShell
} from "./components/AppShell";

import {
  ROLES
} from "./utils/roles";
function PWAManifest() {

  useEffect(() => {

    if (
      document.querySelector(
        'link[rel="manifest"]'
      )
    ) {
      return;
    }



    const manifest = {

      name: "MessManager",

      short_name:
        "MessManager",

      description:
        "Smart mess management workspace",

      start_url: "/",

      display: "standalone",

      background_color:
        "#0a0f1e",

      theme_color:
        "#7c3aed",

      icons: [

        {
          src:
            "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><text y='52' font-size='52'>🍽️</text></svg>",

          sizes: "64x64",

          type:
            "image/svg+xml",
        },
      ],
    };



    const blob = new Blob(
      [JSON.stringify(manifest)],
      {
        type:
          "application/json",
      }
    );



    const link =
      Object.assign(
        document.createElement(
          "link"
        ),
        {
          rel: "manifest",

          href:
            URL.createObjectURL(
              blob
            ),
        }
      );



    document.head.appendChild(
      link
    );

  }, []);

  return null;
}
function AppWithTheme() {
  return (

    <>

      <PWAManifest />

      <BrowserRouter>

        <Routes>

          {/* =====================================
              AUTH ROUTES
          ===================================== */}

          <Route
            path="/login"
            element={<LoginPage />}
          />

          <Route
            path="/member-login"
            element={
              <RoleLoginPage
                role={ROLES.MEMBER}
              />
            }
          />

          <Route
            path="/manager-login"
            element={
              <RoleLoginPage
                role={ROLES.MANAGER}
              />
            }
          />

          <Route
            path="/register"
            element={<RegisterPage />}
          />

          <Route
            path="/forgot-password"
            element={
              <ForgotPasswordPage />
            }
          />

          <Route
            path="/unauthorized"
            element={
              <UnauthorizedPage />
            }
          />



          {/* =====================================
              MAIN APP
          ===================================== */}

          <Route
            path="/*"

            element={

              <ProtectedRoute
                allowedRoles={[
                  "admin",
                  "manager",
                  "member",
                ]}
              >

                <AppShell />

              </ProtectedRoute>
            }
          />

        </Routes>

      </BrowserRouter>

    </>
  );
}
export default function App() {

  return (

    <AuthProvider>

      <ThemeProvider>
        <AppWithTheme />

      </ThemeProvider>

    </AuthProvider>
  );
}

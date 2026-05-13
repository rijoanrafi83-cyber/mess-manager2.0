import React, { useEffect, useState } from "react";

import {
  User,
  Mail,
  Phone,
  Shield,
  Lock,
  Bell,
  Moon,
  Database,
  Save,
} from "lucide-react";

import {
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";

import {
  updateProfile,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";

import { auth, db } from "../firebase";
import { useAuth } from "../context/AuthContext";

export default function SettingsPage() {
  const { user } = useAuth();

  const currentUser = auth.currentUser;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [autoBackup, setAutoBackup] = useState(true);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    const loadUserData = async () => {
      try {
        if (!currentUser) return;

        const userRef = doc(
          db,
          "users",
          currentUser.uid
        );

        const snap = await getDoc(userRef);

        if (snap.exists()) {
          const data = snap.data();

          setFormData({
            fullName:
              data.fullName ||
              currentUser.displayName ||
              "",

            email:
              currentUser.email || "",

            phone:
              data.phone || "",
          });

          setDarkMode(
            data.darkMode ?? true
          );

          setNotifications(
            data.notifications ?? true
          );

          setAutoBackup(
            data.autoBackup ?? true
          );
        } else {
          setFormData({
            fullName:
              currentUser.displayName || "",

            email:
              currentUser.email || "",

            phone: "",
          });
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [currentUser]);

  const handleSaveSettings = async () => {
    try {
      if (!currentUser) {
        alert("User not logged in");
        return;
      }

      setSaving(true);

      await updateProfile(currentUser, {
        displayName: formData.fullName,
      });

      await setDoc(
        doc(db, "users", currentUser.uid),
        {
          fullName: formData.fullName,
          email: currentUser.email,
          phone: formData.phone,

          darkMode,
          notifications,
          autoBackup,

          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      alert("Settings saved successfully 😎");
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    try {
      if (!currentUser) {
        alert("User not logged in");
        return;
      }

      if (!currentPassword || !newPassword) {
        alert("Fill all password fields");
        return;
      }

      if (newPassword.length < 6) {
        alert(
          "Password must be at least 6 characters"
        );
        return;
      }

      const credential =
        EmailAuthProvider.credential(
          currentUser.email,
          currentPassword
        );

      await reauthenticateWithCredential(
        currentUser,
        credential
      );

      await updatePassword(
        currentUser,
        newPassword
      );

      setCurrentPassword("");
      setNewPassword("");

      alert("Password changed successfully 🔥");
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-white text-xl">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060b23] text-white p-6">
      <div className="grid lg:grid-cols-2 gap-6">

        {/* LEFT SIDE */}

        <div className="space-y-6">

          {/* ACCOUNT SETTINGS */}

          <div className="bg-[#0d132d] border border-white/10 rounded-3xl p-6">

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-violet-600/20 flex items-center justify-center">
                <User className="text-violet-400" />
              </div>

              <div>
                <h2 className="text-3xl font-bold">
                  Account Settings
                </h2>

                <p className="text-gray-400">
                  Manage profile information
                </p>
              </div>
            </div>

            {/* FULL NAME */}

            <div className="mb-5">
              <label className="text-gray-300 mb-2 block">
                Full Name
              </label>

              <div className="relative">
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      fullName: e.target.value,
                    })
                  }
                  className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-5 text-white outline-none"
                />
              </div>
            </div>

            {/* EMAIL */}

            <div className="mb-5">
              <label className="text-gray-300 mb-2 block">
                Email Address
              </label>

              <div className="relative">
                <Mail className="absolute left-4 top-4 text-gray-500" />

                <input
                  type="email"
                  disabled
                  value={formData.email}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-14 pr-5 text-gray-400 outline-none"
                />
              </div>
            </div>

            {/* PHONE */}

            <div>
              <label className="text-gray-300 mb-2 block">
                Phone Number
              </label>

              <div className="relative">
                <Phone className="absolute left-4 top-4 text-gray-500" />

                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      phone: e.target.value,
                    })
                  }
                  className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-14 pr-5 text-white outline-none"
                />
              </div>
            </div>
          </div>

          {/* SECURITY */}

          <div className="bg-[#0d132d] border border-white/10 rounded-3xl p-6">

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-red-600/20 flex items-center justify-center">
                <Shield className="text-red-400" />
              </div>

              <div>
                <h2 className="text-3xl font-bold">
                  Security
                </h2>

                <p className="text-gray-400">
                  Secure your account
                </p>
              </div>
            </div>

            <div className="space-y-4">

              {/* CURRENT PASSWORD */}

              <input
                type="password"
                placeholder="Current password"
                value={currentPassword}
                onChange={(e) =>
                  setCurrentPassword(
                    e.target.value
                  )
                }
                className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-5 text-white outline-none"
              />

              {/* NEW PASSWORD */}

              <input
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={(e) =>
                  setNewPassword(
                    e.target.value
                  )
                }
                className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-5 text-white outline-none"
              />

              {/* CHANGE PASSWORD BUTTON */}

              <button
                onClick={handlePasswordChange}
                className="w-full py-4 rounded-2xl bg-yellow-600 hover:bg-yellow-500 transition font-bold text-black text-lg"
              >
                Change Password
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE */}

        <div className="space-y-6">

          {/* PREFERENCES */}

          <div className="bg-[#0d132d] border border-white/10 rounded-3xl p-6">

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 flex items-center justify-center">
                <Bell className="text-indigo-400" />
              </div>

              <div>
                <h2 className="text-3xl font-bold">
                  Preferences
                </h2>

                <p className="text-gray-400">
                  Customize your experience
                </p>
              </div>
            </div>

            {/* DARK MODE */}

            <div className="flex items-center justify-between bg-black/30 rounded-2xl p-5 mb-4">
              <div className="flex items-center gap-4">
                <Moon className="text-violet-400" />

                <div>
                  <h3 className="font-bold text-lg">
                    Dark Mode
                  </h3>

                  <p className="text-gray-400 text-sm">
                    Toggle dark interface
                  </p>
                </div>
              </div>

              <button
                onClick={() =>
                  setDarkMode(!darkMode)
                }
                className={`w-16 h-8 rounded-full transition ${
                  darkMode
                    ? "bg-violet-600"
                    : "bg-gray-600"
                }`}
              >
                <div
                  className={`w-7 h-7 bg-white rounded-full transition transform ${
                    darkMode
                      ? "translate-x-8"
                      : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* NOTIFICATIONS */}

            <div className="flex items-center justify-between bg-black/30 rounded-2xl p-5 mb-4">
              <div>
                <h3 className="font-bold text-lg">
                  Notifications
                </h3>

                <p className="text-gray-400 text-sm">
                  Receive system alerts
                </p>
              </div>

              <button
                onClick={() =>
                  setNotifications(
                    !notifications
                  )
                }
                className={`w-16 h-8 rounded-full transition ${
                  notifications
                    ? "bg-pink-600"
                    : "bg-gray-600"
                }`}
              >
                <div
                  className={`w-7 h-7 bg-white rounded-full transition transform ${
                    notifications
                      ? "translate-x-8"
                      : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* BACKUP */}

            <div className="flex items-center justify-between bg-black/30 rounded-2xl p-5">
              <div className="flex items-center gap-4">
                <Database className="text-green-400" />

                <div>
                  <h3 className="font-bold text-lg">
                    Auto Backup
                  </h3>

                  <p className="text-gray-400 text-sm">
                    Secure cloud backup
                  </p>
                </div>
              </div>

              <button
                onClick={() =>
                  setAutoBackup(!autoBackup)
                }
                className={`w-16 h-8 rounded-full transition ${
                  autoBackup
                    ? "bg-green-600"
                    : "bg-gray-600"
                }`}
              >
                <div
                  className={`w-7 h-7 bg-white rounded-full transition transform ${
                    autoBackup
                      ? "translate-x-8"
                      : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* SAVE SETTINGS */}

          <div className="bg-gradient-to-br from-violet-700 to-purple-600 rounded-3xl p-8">

            <h2 className="text-4xl font-bold mb-4">
              Save Changes
            </h2>

            <p className="text-white/80 mb-10 text-lg">
              Apply and save all your updated
              preferences instantly.
            </p>

            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="w-full bg-white text-black font-bold py-5 rounded-2xl flex items-center justify-center gap-3 text-xl hover:scale-[1.02] transition"
            >
              <Save size={22} />

              {saving
                ? "Saving..."
                : "Save Settings"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
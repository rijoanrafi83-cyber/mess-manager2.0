import { useEffect, useState } from "react";
import {
  User,
  Moon,
  Sun,
  Bell,
  Shield,
  Database,
  Palette,
  Save,
  Camera,
  Lock,
  Mail,
  Smartphone,
} from "lucide-react";

import {
  updatePassword,
  updateProfile,
} from "firebase/auth";

import {
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";

import { auth, db } from "../firebase";
import { useAuth } from "../context/AuthContext";

export function SettingsPage() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);

  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] =
    useState(true);
  const [autoBackup, setAutoBackup] =
    useState(true);

  const [newPassword, setNewPassword] =
    useState("");

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
  });

  // Load user settings
  useEffect(() => {
    const loadUserData = async () => {
      try {
        if (!user) return;

        const userRef = doc(db, "users", user.uid);

        const snap = await getDoc(userRef);

        if (snap.exists()) {
          const data = snap.data();

          setFormData({
            fullName:
              data.fullName ||
              user.displayName ||
              "",

            email:
              data.email ||
              user.email ||
              "",

            phone: data.phone || "",
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
              user.displayName || "",

            email: user.email || "",

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
  }, [user]);

  // Save settings
  const handleSaveSettings = async () => {
    try {
      if (!user) return;

      // Update auth profile
      await updateProfile(auth.currentUser, {
        displayName: formData.fullName,
      });

      // Save to firestore
      await setDoc(
        doc(db, "users", user.uid),
        {
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,

          darkMode,
          notifications,
          autoBackup,

          updatedAt: new Date(),
        },
        { merge: true }
      );

      alert(
        "Settings saved successfully 😎"
      );
    } catch (error) {
      console.error(error);

      alert(error.message);
    }
  };

  // Change password
  const handlePasswordChange = async () => {
    try {
      if (!newPassword) {
        return alert(
          "Enter a new password"
        );
      }

      if (newPassword.length < 6) {
        return alert(
          "Password must be at least 6 characters"
        );
      }

      await updatePassword(
        auth.currentUser,
        newPassword
      );

      setNewPassword("");

      alert("Password updated 😎");
    } catch (error) {
      console.error(error);

      alert(error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b1a] flex items-center justify-center text-white text-xl">
        Loading Settings...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b1a] text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight">
          Settings
        </h1>

        <p className="text-gray-400 mt-2">
          Manage your mess application
          preferences and account settings.
        </p>
      </div>

      {/* Profile Card */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 mb-6 backdrop-blur-xl">
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-3xl font-bold shadow-lg">
              {formData.fullName?.charAt(0) ||
                "U"}
            </div>

            <button className="absolute -bottom-2 -right-2 w-9 h-9 rounded-full bg-violet-600 hover:bg-violet-700 flex items-center justify-center transition">
              <Camera size={16} />
            </button>
          </div>

          <div>
            <h2 className="text-2xl font-semibold">
              {formData.fullName ||
                "Unknown User"}
            </h2>

            <p className="text-gray-400">
              Administrator
            </p>

            <div className="flex gap-3 mt-3">
              <div className="px-3 py-1 rounded-full bg-violet-500/20 text-violet-300 text-sm border border-violet-500/20">
                Premium User
              </div>

              <div className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-sm border border-emerald-500/20">
                Active
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Account Settings */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-xl bg-violet-500/20 flex items-center justify-center">
              <User className="text-violet-400" />
            </div>

            <div>
              <h3 className="text-xl font-semibold">
                Account Settings
              </h3>

              <p className="text-sm text-gray-400">
                Manage profile information
              </p>
            </div>
          </div>

          <div className="space-y-5">
            {/* Full Name */}
            <div>
              <label className="text-sm text-gray-400 block mb-2">
                Full Name
              </label>

              <input
                type="text"
                value={formData.fullName}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    fullName: e.target.value,
                  })
                }
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-violet-500"
              />
            </div>

            {/* Email */}
            <div>
              <label className="text-sm text-gray-400 block mb-2">
                Email Address
              </label>

              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-4 top-4 text-gray-500"
                />

                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      email: e.target.value,
                    })
                  }
                  className="w-full bg-black/30 border border-white/10 rounded-xl pl-11 pr-4 py-3 outline-none focus:border-violet-500"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="text-sm text-gray-400 block mb-2">
                Phone Number
              </label>

              <div className="relative">
                <Smartphone
                  size={18}
                  className="absolute left-4 top-4 text-gray-500"
                />

                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      phone: e.target.value,
                    })
                  }
                  className="w-full bg-black/30 border border-white/10 rounded-xl pl-11 pr-4 py-3 outline-none focus:border-violet-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-xl bg-indigo-500/20 flex items-center justify-center">
              <Palette className="text-indigo-400" />
            </div>

            <div>
              <h3 className="text-xl font-semibold">
                Preferences
              </h3>

              <p className="text-sm text-gray-400">
                Customize your experience
              </p>
            </div>
          </div>

          <div className="space-y-5">
            {/* Dark Mode */}
            <div className="flex items-center justify-between bg-black/20 border border-white/5 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                {darkMode ? (
                  <Moon className="text-violet-400" />
                ) : (
                  <Sun className="text-yellow-400" />
                )}

                <div>
                  <p className="font-medium">
                    Dark Mode
                  </p>

                  <p className="text-sm text-gray-400">
                    Toggle dark interface
                  </p>
                </div>
              </div>

              <button
                onClick={() =>
                  setDarkMode(!darkMode)
                }
                className={`w-14 h-7 rounded-full transition relative ${
                  darkMode
                    ? "bg-violet-600"
                    : "bg-gray-600"
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full absolute top-1 transition ${
                    darkMode
                      ? "left-8"
                      : "left-1"
                  }`}
                />
              </button>
            </div>

            {/* Notifications */}
            <div className="flex items-center justify-between bg-black/20 border border-white/5 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <Bell className="text-pink-400" />

                <div>
                  <p className="font-medium">
                    Notifications
                  </p>

                  <p className="text-sm text-gray-400">
                    Receive system alerts
                  </p>
                </div>
              </div>

              <button
                onClick={() =>
                  setNotifications(
                    !notifications
                  )
                }
                className={`w-14 h-7 rounded-full transition relative ${
                  notifications
                    ? "bg-pink-600"
                    : "bg-gray-600"
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full absolute top-1 transition ${
                    notifications
                      ? "left-8"
                      : "left-1"
                  }`}
                />
              </button>
            </div>

            {/* Backup */}
            <div className="flex items-center justify-between bg-black/20 border border-white/5 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <Database className="text-emerald-400" />

                <div>
                  <p className="font-medium">
                    Auto Backup
                  </p>

                  <p className="text-sm text-gray-400">
                    Secure cloud backup
                  </p>
                </div>
              </div>

              <button
                onClick={() =>
                  setAutoBackup(!autoBackup)
                }
                className={`w-14 h-7 rounded-full transition relative ${
                  autoBackup
                    ? "bg-emerald-600"
                    : "bg-gray-600"
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full absolute top-1 transition ${
                    autoBackup
                      ? "left-8"
                      : "left-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-xl bg-red-500/20 flex items-center justify-center">
              <Shield className="text-red-400" />
            </div>

            <div>
              <h3 className="text-xl font-semibold">
                Security
              </h3>

              <p className="text-sm text-gray-400">
                Secure your account
              </p>
            </div>
          </div>

          <div className="space-y-5">
            {/* Change Password */}
            <div className="bg-black/20 border border-white/5 rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-4">
                <Lock className="text-yellow-400" />

                <div>
                  <p className="font-medium">
                    Change Password
                  </p>

                  <p className="text-sm text-gray-400">
                    Update your password
                  </p>
                </div>
              </div>

              <input
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) =>
                  setNewPassword(
                    e.target.value
                  )
                }
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-violet-500 mb-4"
              />

              <button
                onClick={
                  handlePasswordChange
                }
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-3 rounded-xl transition"
              >
                Change Password
              </button>
            </div>
          </div>
        </div>

        {/* Save Settings */}
        <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-3xl p-6 flex flex-col justify-between shadow-2xl">
          <div>
            <h3 className="text-2xl font-bold mb-3">
              Save Changes
            </h3>

            <p className="text-violet-100">
              Apply and save all your
              updated preferences instantly.
            </p>
          </div>

          <button
            onClick={handleSaveSettings}
            className="mt-8 w-full bg-white text-black font-semibold py-4 rounded-2xl hover:scale-[1.02] transition flex items-center justify-center gap-2"
          >
            <Save size={18} />
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
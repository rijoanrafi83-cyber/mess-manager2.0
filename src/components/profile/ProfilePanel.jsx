import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  AnimatePresence,
  motion,
} from "framer-motion";

import {
  BriefcaseBusiness,
  Camera,
  CheckCircle2,
  Loader2,
  Mail,
  Phone,
  Save,
  Shield,
  Sparkles,
  User,
  X,
} from "lucide-react";

import toast from "react-hot-toast";

import { updateProfile } from "firebase/auth";
import {
  doc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { db } from "../../firebase";
import { ROLE_LABELS, ROLES } from "../../utils/roles";
import { ProfileAvatar } from "./ProfileAvatar";

const profileFields = [
  "fullName",
  "email",
  "phone",
  "bio",
  "photoURL",
];

const MAX_INPUT_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_AVATAR_BYTES = 200 * 1024;
const AVATAR_SIZE = 320;

function dataUrlBytes(dataURL) {
  const base64 = dataURL.split(",")[1] || "";
  return Math.ceil((base64.length * 3) / 4);
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read the selected image."));
    };
    image.src = url;
  });
}

async function compressAvatarImage(file) {
  const image = await loadImageFromFile(file);
  const canvas = document.createElement("canvas");
  const scale = Math.min(
    AVATAR_SIZE / image.width,
    AVATAR_SIZE / image.height,
    1
  );
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d", {
    alpha: false,
  });

  if (!context) {
    throw new Error("Image compression is not supported in this browser.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  let quality = 0.82;
  let dataURL = canvas.toDataURL("image/jpeg", quality);

  while (
    dataUrlBytes(dataURL) > MAX_AVATAR_BYTES &&
    quality > 0.45
  ) {
    quality -= 0.08;
    dataURL = canvas.toDataURL("image/jpeg", quality);
  }

  if (dataUrlBytes(dataURL) > MAX_AVATAR_BYTES) {
    throw new Error(
      "Image is still too large after compression. Try a smaller picture."
    );
  }

  return dataURL;
}

function formatDate(value) {
  if (!value) return "Not available";

  const date =
    typeof value?.toDate === "function"
      ? value.toDate()
      : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function profileCompletion(form) {
  const complete = profileFields.filter((key) =>
    Boolean(String(form[key] || "").trim())
  ).length;

  return Math.round((complete / profileFields.length) * 100);
}

function Field({
  label,
  icon: Icon,
  className = "",
  ...props
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] theme-muted-text">
        {label}
      </span>
      <span className="relative block">
        <Icon
          size={17}
          className="absolute left-4 top-1/2 -translate-y-1/2 theme-muted-text"
        />
        <input
          {...props}
          className="w-full rounded-2xl border theme-field py-3.5 pl-12 pr-4 text-sm outline-none transition placeholder:text-slate-500"
        />
      </span>
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] theme-muted-text">
        {label}
      </span>
      <textarea
        value={value}
        onChange={onChange}
        rows={4}
        className="w-full resize-none rounded-2xl border theme-field px-4 py-3.5 text-sm outline-none transition placeholder:text-slate-500"
        placeholder="A short note about you and how you run the workspace."
      />
    </label>
  );
}

export function ProfilePanel({
  open,
  onClose,
  userProfile,
  currentUser,
  settings,
}) {
  const fileInputRef = useRef(null);
  const uploadRunRef = useRef(0);
  const [saving, setSaving] = useState(false);
  const [processingImage, setProcessingImage] = useState(false);
  const [avatarPreviewURL, setAvatarPreviewURL] = useState("");
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    bio: "",
    photoURL: "",
  });

  useEffect(() => {
    if (!open) return;

    const nextPhotoURL =
      userProfile?.photoURL ||
      currentUser?.photoURL ||
      "";

    setForm({
      fullName:
        userProfile?.fullName ||
        userProfile?.displayName ||
        currentUser?.displayName ||
        "",
      email:
        currentUser?.email ||
        userProfile?.email ||
        "",
      phone: userProfile?.phone || "",
      bio: userProfile?.bio || "",
      photoURL: nextPhotoURL,
    });
    setAvatarPreviewURL(nextPhotoURL);
  }, [
    currentUser?.displayName,
    currentUser?.email,
    currentUser?.photoURL,
    open,
    userProfile?.bio,
    userProfile?.displayName,
    userProfile?.email,
    userProfile?.fullName,
    userProfile?.phone,
    userProfile?.photoURL,
  ]);

  const completion = useMemo(
    () => profileCompletion(form),
    [form]
  );

  const updateForm = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const uploadAvatar = async (file) => {
    if (!file || !currentUser) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file");
      return;
    }

    if (file.size > MAX_INPUT_IMAGE_BYTES) {
      toast.error("Profile image must be under 8 MB");
      return;
    }

    const runId = uploadRunRef.current + 1;
    uploadRunRef.current = runId;

    const localPreviewURL = URL.createObjectURL(file);
    setAvatarPreviewURL(localPreviewURL);

    try {
      setProcessingImage(true);
      const photoURL = await compressAvatarImage(file);

      if (uploadRunRef.current !== runId) {
        return;
      }

      updateForm("photoURL", photoURL);
      setAvatarPreviewURL(photoURL);
      toast.success("Profile image ready. Save profile to sync.");
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Could not process image");

      if (uploadRunRef.current === runId) {
        setAvatarPreviewURL(form.photoURL || "");
      }
    } finally {
      URL.revokeObjectURL(localPreviewURL);

      if (uploadRunRef.current === runId) {
        setProcessingImage(false);
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const saveProfile = async () => {
    if (!currentUser) {
      toast.error("User not logged in");
      return;
    }

    try {
      setSaving(true);

      const displayName =
        form.fullName.trim() ||
        currentUser.displayName ||
        currentUser.email;
      const payload = {
        displayName,
        fullName: displayName,
        email: currentUser.email || form.email,
        phone: form.phone.trim(),
        bio: form.bio.trim(),
        photoURL: form.photoURL,
        updatedAt: serverTimestamp(),
      };

      await updateProfile(currentUser, {
        displayName,
      });

      await setDoc(
        doc(db, "users", currentUser.uid),
        {
          ...payload,
          role: userProfile?.role || ROLES.ADMIN,
        },
        { merge: true }
      );

      if (userProfile?.role === ROLES.ADMIN) {
        await setDoc(
          doc(db, "adminProfiles", currentUser.uid),
          {
            ...payload,
            role: ROLES.ADMIN,
            ownerId: currentUser.uid,
            accountStatus: "active",
            status: "active",
          },
          { merge: true }
        );
      } else {
        await setDoc(
          doc(db, "memberAccess", currentUser.uid),
          payload,
          { merge: true }
        );
      }

      toast.success("Profile updated");
      onClose();
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[180] bg-black/55 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.aside
            initial={{ opacity: 0, x: 36, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 36, scale: 0.98 }}
            transition={{
              type: "spring",
              damping: 24,
              stiffness: 210,
            }}
            className="fixed right-3 top-3 z-[190] flex max-h-[calc(100vh-1.5rem)] w-[calc(100vw-1.5rem)] max-w-xl flex-col overflow-hidden rounded-[2rem] border theme-card shadow-2xl backdrop-blur-2xl sm:right-5 sm:top-5 sm:max-h-[calc(100vh-2.5rem)]"
          >
            <div className="relative overflow-hidden border-b p-5">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,color-mix(in_srgb,var(--accent)_36%,transparent),transparent_36%)]" />
              <div className="relative flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <ProfileAvatar
                      name={form.fullName}
                      photoURL={avatarPreviewURL}
                      size="xl"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={processingImage}
                      className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-2xl border border-white/20 theme-card shadow-xl transition hover:scale-105 disabled:cursor-wait disabled:opacity-60"
                    >
                      {processingImage ? (
                        <Loader2
                          size={16}
                          className="animate-spin theme-accent-text"
                        />
                      ) : (
                        <Camera
                          size={16}
                          className="theme-accent-text"
                        />
                      )}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) =>
                        uploadAvatar(event.target.files?.[0])
                      }
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold theme-accent-text">
                      <Sparkles size={13} />
                      Profile workspace
                    </div>
                    <h2 className="truncate text-2xl font-black theme-text">
                      {form.fullName || "Your profile"}
                    </h2>
                    <p className="mt-1 text-sm theme-muted-text">
                      {ROLE_LABELS[userProfile?.role] || "User"} · {settings?.messName || "MessManager"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-2xl p-2 theme-muted-text transition hover:bg-white/10 hover:text-[var(--text-primary)]"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="relative mt-5 rounded-2xl border theme-muted p-4">
                <div className="mb-2 flex items-center justify-between text-xs font-bold theme-muted-text">
                  <span>Profile completion</span>
                  <span>{completion}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${completion}%` }}
                    className="h-full rounded-full theme-accent-bg"
                  />
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Full name"
                  icon={User}
                  value={form.fullName}
                  onChange={(event) =>
                    updateForm("fullName", event.target.value)
                  }
                  placeholder="Your name"
                />
                <Field
                  label="Phone"
                  icon={Phone}
                  value={form.phone}
                  onChange={(event) =>
                    updateForm("phone", event.target.value)
                  }
                  placeholder="+880..."
                />
                <Field
                  label="Email"
                  icon={Mail}
                  value={form.email}
                  disabled
                  className="sm:col-span-2"
                />
              </div>

              <TextArea
                label="Bio / about"
                value={form.bio}
                onChange={(event) =>
                  updateForm("bio", event.target.value)
                }
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border theme-muted p-4">
                  <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] theme-muted-text">
                    <Shield size={15} />
                    Role
                  </div>
                  <p className="text-sm font-bold theme-text">
                    {ROLE_LABELS[userProfile?.role] || "User"}
                  </p>
                </div>
                <div className="rounded-2xl border theme-muted p-4">
                  <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] theme-muted-text">
                    <BriefcaseBusiness size={15} />
                    Joined
                  </div>
                  <p className="text-sm font-bold theme-text">
                    {formatDate(
                      userProfile?.createdAt ||
                        userProfile?.joinedAt ||
                        currentUser?.metadata?.creationTime
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t p-5">
              <button
                type="button"
                onClick={saveProfile}
                disabled={saving || processingImage}
                className="flex w-full items-center justify-center gap-2 rounded-2xl theme-accent-bg px-5 py-4 text-sm font-black text-white shadow-xl shadow-[color-mix(in_srgb,var(--accent)_24%,transparent)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <Loader2
                    size={18}
                    className="animate-spin"
                  />
                ) : (
                  <Save size={18} />
                )}
                {saving
                  ? "Saving profile..."
                  : processingImage
                  ? "Optimizing image..."
                  : "Save profile"}
              </button>

              <div className="mt-3 flex items-center justify-center gap-2 text-xs theme-muted-text">
                <CheckCircle2
                  size={14}
                  className="theme-accent-text"
                />
                Stored only in your isolated workspace profile.
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, query, where, serverTimestamp,
  getDocs, orderBy, limit, writeBatch, getDoc, setDoc
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "../firebase";

// ─── Generic helpers ───────────────────────────────────────────────────────────

const col = (name) => collection(db, name);
const docRef = (name, id) => doc(db, name, id);

const ownerQuery = (name, ownerId, ...constraints) =>
  query(col(name), where("ownerId", "==", ownerId), ...constraints);

export const subscribeCollection = (collectionName, ownerId, callback, ...constraints) => {
  const q = ownerQuery(collectionName, ownerId, ...constraints);
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }, (err) => {
    console.error(`subscribeCollection[${collectionName}]:`, err);
    callback([]);
  });
};

// ─── MEMBERS ────────────────────────────────────────────────────────────────

export const addMember = (ownerId, data) =>
  addDoc(col("members"), { ...data, ownerId, createdAt: serverTimestamp() });

export const updateMember = (id, data) =>
  updateDoc(docRef("members", id), { ...data, updatedAt: serverTimestamp() });

export const deleteMember = async (id) => {
  const batch = writeBatch(db);
  batch.delete(docRef("members", id));
  // cascade: meals, deposits owned by member stay but can be filtered
  await batch.commit();
};

// ─── MEALS ──────────────────────────────────────────────────────────────────

export const addMeal = (ownerId, data) =>
  addDoc(col("meals"), {
    ...data, ownerId, createdAt: serverTimestamp(),
    totalMeals: (Number(data.breakfast || 0) * 0.5) +
                Number(data.lunch || 0) +
                Number(data.dinner || 0),
  });

export const updateMeal = (id, data) =>
  updateDoc(docRef("meals", id), {
    ...data,
    totalMeals: (Number(data.breakfast || 0) * 0.5) +
                Number(data.lunch || 0) +
                Number(data.dinner || 0),
    updatedAt: serverTimestamp(),
  });

export const deleteMeal = (id) => deleteDoc(docRef("meals", id));

// ─── GUEST MEALS ────────────────────────────────────────────────────────────

export const addGuestMeal = (ownerId, data) =>
  addDoc(col("guestMeals"), {
    ...data, ownerId, createdAt: serverTimestamp(),
    totalGuestMeals: (Number(data.breakfast || 0) * 0.5) +
                     Number(data.lunch || 0) +
                     Number(data.dinner || 0),
  });

export const updateGuestMeal = (id, data) =>
  updateDoc(docRef("guestMeals", id), { ...data, updatedAt: serverTimestamp() });

export const deleteGuestMeal = (id) => deleteDoc(docRef("guestMeals", id));

// ─── BAZAAR ─────────────────────────────────────────────────────────────────

export const addBazaar = async (ownerId, data, receiptFile = null) => {
  let receiptURL = null;
  if (receiptFile && storage) {
    const storageRef = ref(storage, `receipts/${ownerId}/${Date.now()}_${receiptFile.name}`);
    const snap = await uploadBytes(storageRef, receiptFile);
    receiptURL = await getDownloadURL(snap.ref);
  }
  return addDoc(col("bazaar"), {
    ...data, ownerId, receiptURL, createdAt: serverTimestamp(),
  });
};

export const updateBazaar = (id, data) =>
  updateDoc(docRef("bazaar", id), { ...data, updatedAt: serverTimestamp() });

export const deleteBazaar = (id) => deleteDoc(docRef("bazaar", id));

// ─── DEPOSITS ───────────────────────────────────────────────────────────────

export const addDeposit = (ownerId, data) =>
  addDoc(col("deposits"), { ...data, ownerId, createdAt: serverTimestamp() });

export const updateDeposit = (id, data) =>
  updateDoc(docRef("deposits", id), { ...data, updatedAt: serverTimestamp() });

export const deleteDeposit = (id) => deleteDoc(docRef("deposits", id));

// ─── EXTRA COSTS ────────────────────────────────────────────────────────────

export const addExtraCost = (ownerId, data) =>
  addDoc(col("extraCosts"), { ...data, ownerId, createdAt: serverTimestamp() });

export const deleteExtraCost = (id) => deleteDoc(docRef("extraCosts", id));

// ─── NOTICES ────────────────────────────────────────────────────────────────

export const addNotice = (ownerId, data) =>
  addDoc(col("notices"), { ...data, ownerId, createdAt: serverTimestamp() });

export const deleteNotice = (id) => deleteDoc(docRef("notices", id));

// ─── NOTIFICATIONS ──────────────────────────────────────────────────────────

export const addNotification = (ownerId, { title, message, type = "info" }) =>
  addDoc(col("notifications"), {
    ownerId, title, message, type,
    read: false, createdAt: serverTimestamp(),
  });

export const markNotificationRead = (id) =>
  updateDoc(docRef("notifications", id), { read: true });

export const markAllNotificationsRead = async (ownerId) => {
  const q = ownerQuery("notifications", ownerId, where("read", "==", false));
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
  await batch.commit();
};

// ─── SETTINGS ───────────────────────────────────────────────────────────────

export const getSettings = async (ownerId) => {
  const ref = docRef("settings", ownerId);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
};

export const updateSettings = (ownerId, data) =>
  setDoc(docRef("settings", ownerId), { ...data, updatedAt: serverTimestamp() }, { merge: true });

export const subscribeSettings = (ownerId, callback) =>
  onSnapshot(docRef("settings", ownerId), (snap) => {
    callback(snap.exists() ? snap.data() : null);
  });

// ─── MONTHLY REPORTS ────────────────────────────────────────────────────────

export const saveMonthlyReport = (ownerId, month, data) =>
  setDoc(docRef("monthlyReports", `${ownerId}_${month}`), {
    ...data, ownerId, month, savedAt: serverTimestamp(),
  }, { merge: true });

export const getMonthlyReport = async (ownerId, month) => {
  const snap = await getDoc(docRef("monthlyReports", `${ownerId}_${month}`));
  return snap.exists() ? snap.data() : null;
};
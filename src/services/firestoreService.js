// src/services/firestoreService.js
// All Firestore operations. Every write stamps ownerId = currentUser.uid.
// Every query filters by ownerId for complete data isolation.

import {
  collection, doc, addDoc, setDoc, updateDoc, deleteDoc,
  getDocs, onSnapshot, query, where, orderBy, serverTimestamp,
  getDoc,
} from "firebase/firestore";
import { db } from "./firebase";

// ─── Generic helpers ──────────────────────────────────────────────────────────

/** Real-time listener for an owner-scoped collection */
export function subscribeCollection(colName, ownerId, order, callback, onError) {
  const constraints = [where("ownerId", "==", ownerId)];
  if (order) constraints.push(orderBy(order.field, order.dir || "asc"));
  const q = query(collection(db, colName), ...constraints);
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), onError);
}

/** Add doc with ownerId stamped */
export async function addOwned(colName, ownerId, data) {
  return addDoc(collection(db, colName), {
    ...data,
    ownerId,
    createdAt: serverTimestamp(),
  });
}

/** Update any doc */
export async function updateOwned(colName, docId, data) {
  return updateDoc(doc(db, colName, docId), { ...data, updatedAt: serverTimestamp() });
}

/** Delete any doc */
export async function deleteOwned(colName, docId) {
  return deleteDoc(doc(db, colName, docId));
}

/** SetDoc with merge (used for meals keyed by date_memberId) */
export async function setMealDoc(docId, ownerId, data) {
  return setDoc(doc(db, "meals", docId), { ...data, ownerId }, { merge: true });
}

// ─── Admin profile ────────────────────────────────────────────────────────────

export async function getAdminProfile(uid) {
  const snap = await getDoc(doc(db, "admins", uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function updateAdminProfile(uid, data) {
  return updateDoc(doc(db, "admins", uid), { ...data, updatedAt: serverTimestamp() });
}

// ─── Members ──────────────────────────────────────────────────────────────────

export function subscribeMembers(ownerId, callback, onError) {
  return subscribeCollection("members", ownerId, { field: "createdAt", dir: "asc" }, callback, onError);
}

export async function addMember(ownerId, data) {
  return addOwned("members", ownerId, data);
}

export async function updateMember(memberId, data) {
  return updateOwned("members", memberId, data);
}

export async function deleteMember(memberId) {
  return deleteOwned("members", memberId);
}

// ─── Meals ────────────────────────────────────────────────────────────────────

export function subscribeMeals(ownerId, callback, onError) {
  const q = query(collection(db, "meals"), where("ownerId", "==", ownerId));
  return onSnapshot(
    q,
    (snap) => {
      const map = {};
      snap.docs.forEach((d) => { map[d.id] = { id: d.id, ...d.data() }; });
      callback(map);
    },
    onError
  );
}

export async function toggleMeal(docId, ownerId, data) {
  return setMealDoc(docId, ownerId, data);
}

// ─── Bazaar ───────────────────────────────────────────────────────────────────

export function subscribeBazaar(ownerId, callback, onError) {
  return subscribeCollection("bazaar", ownerId, { field: "date", dir: "desc" }, callback, onError);
}

export async function addBazaar(ownerId, data) {
  return addOwned("bazaar", ownerId, data);
}

export async function updateBazaar(docId, data) {
  return updateOwned("bazaar", docId, data);
}

export async function deleteBazaar(docId) {
  return deleteOwned("bazaar", docId);
}

// ─── Deposits ─────────────────────────────────────────────────────────────────

export function subscribeDeposits(ownerId, callback, onError) {
  return subscribeCollection("deposits", ownerId, { field: "date", dir: "desc" }, callback, onError);
}

export async function addDeposit(ownerId, data) {
  return addOwned("deposits", ownerId, data);
}

export async function deleteDeposit(docId) {
  return deleteOwned("deposits", docId);
}

// ─── Extra Charges ────────────────────────────────────────────────────────────

export function subscribeExtraCharges(ownerId, callback, onError) {
  return subscribeCollection("extraCharges", ownerId, { field: "date", dir: "desc" }, callback, onError);
}

export async function addExtraCharge(ownerId, data) {
  return addOwned("extraCharges", ownerId, data);
}

export async function deleteExtraCharge(docId) {
  return deleteOwned("extraCharges", docId);
}

// ─── Guest Meals ──────────────────────────────────────────────────────────────

export function subscribeGuestMeals(ownerId, callback, onError) {
  return subscribeCollection("guestMeals", ownerId, { field: "date", dir: "desc" }, callback, onError);
}

export async function addGuestMeal(ownerId, data) {
  return addOwned("guestMeals", ownerId, data);
}

export async function deleteGuestMeal(docId) {
  return deleteOwned("guestMeals", docId);
}

// ─── Member Accounts (login linking) ─────────────────────────────────────────

export function subscribeMemberAccounts(ownerId, callback, onError) {
  return subscribeCollection("memberAccounts", ownerId, null, callback, onError);
}

export async function setMemberAccount(ownerId, accountData) {
  // accountData: { memberId, memberUid, name, email }
  // Use memberId as doc key under owner scope to allow upsert
  const docId = `${ownerId}_${accountData.memberId}`;
  return setDoc(doc(db, "memberAccounts", docId), {
    ...accountData,
    ownerId,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function deleteMemberAccount(docId) {
  return deleteOwned("memberAccounts", docId);
}

// ─── Member-scoped reads (for member portal) ──────────────────────────────────

/** A member can read their own meals by querying memberLinkedUid */
export function subscribeMemberMeals(memberUid, callback, onError) {
  const q = query(collection(db, "meals"), where("memberLinkedUid", "==", memberUid));
  return onSnapshot(
    q,
    (snap) => {
      const map = {};
      snap.docs.forEach((d) => { map[d.id] = { id: d.id, ...d.data() }; });
      callback(map);
    },
    onError
  );
}

export function subscribeMemberDeposits(memberLinkedUid, callback, onError) {
  const q = query(collection(db, "deposits"), where("memberLinkedUid", "==", memberLinkedUid));
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), onError);
}

export function subscribeMemberExtraCharges(memberLinkedUid, callback, onError) {
  const q = query(collection(db, "extraCharges"), where("memberLinkedUid", "==", memberLinkedUid));
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), onError);
}
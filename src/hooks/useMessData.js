// src/hooks/useMessData.js
// Single hook that sets up all real-time Firestore listeners for an admin.
// Returns all state needed by admin pages.

import { useState, useEffect, useCallback } from "react";
import {
  subscribeMembers, subscribeMeals, subscribeBazaar,
  subscribeDeposits, subscribeExtraCharges, subscribeGuestMeals,
  subscribeMemberAccounts,
} from "./firestoreService";

export function useMessData(ownerId, notify) {
  const [members, setMembers] = useState([]);
  const [meals, setMeals] = useState({});
  const [bazaar, setBazaar] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [extraCharges, setExtraCharges] = useState([]);
  const [guestMeals, setGuestMeals] = useState([]);
  const [memberAccounts, setMemberAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ownerId) return;
    setLoading(true);

    const err = (label) => (e) => {
      console.error(label, e);
      notify?.(`Failed to load ${label}`, "error");
    };

    let membersLoaded = false;
    const unsubs = [
      subscribeMembers(ownerId, (data) => {
        setMembers(data);
        if (!membersLoaded) { membersLoaded = true; setLoading(false); }
      }, err("members")),
      subscribeMeals(ownerId, setMeals, err("meals")),
      subscribeBazaar(ownerId, setBazaar, err("bazaar")),
      subscribeDeposits(ownerId, setDeposits, err("deposits")),
      subscribeExtraCharges(ownerId, setExtraCharges, err("extraCharges")),
      subscribeGuestMeals(ownerId, setGuestMeals, err("guestMeals")),
      subscribeMemberAccounts(ownerId, setMemberAccounts, err("memberAccounts")),
    ];

    // Fallback: if members fires error, stop loading
    setTimeout(() => setLoading(false), 5000);

    return () => unsubs.forEach((u) => u());
  }, [ownerId]); // eslint-disable-line

  return { members, meals, bazaar, deposits, extraCharges, guestMeals, memberAccounts, loading };
}
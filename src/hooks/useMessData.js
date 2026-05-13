import { useEffect, useState, useCallback } from "react";
import { subscribeCollection, subscribeSettings } from "../services/firestoreService";

export function useMessData(ownerId) {
  const [members,       setMembers]       = useState([]);
  const [meals,         setMeals]         = useState([]);
  const [guestMeals,    setGuestMeals]    = useState([]);
  const [bazaar,        setBazaar]        = useState([]);
  const [deposits,      setDeposits]      = useState([]);
  const [extraCosts,    setExtraCosts]    = useState([]);
  const [notices,       setNotices]       = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [settings,      setSettings]      = useState(null);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    if (!ownerId) { setLoading(false); return; }

    let loadCount = 0;
    const total = 8;
    const onLoad = () => { loadCount++; if (loadCount >= total) setLoading(false); };

    const wrap = (setter) => (data) => { setter(data); onLoad(); };

    const unsubs = [
      subscribeCollection("members",       ownerId, wrap(setMembers)),
      subscribeCollection("meals",         ownerId, wrap(setMeals)),
      subscribeCollection("guestMeals",    ownerId, wrap(setGuestMeals)),
      subscribeCollection("bazaar",        ownerId, wrap(setBazaar)),
      subscribeCollection("deposits",      ownerId, wrap(setDeposits)),
      subscribeCollection("extraCosts",    ownerId, wrap(setExtraCosts)),
      subscribeCollection("notices",       ownerId, wrap(setNotices)),
      subscribeCollection("notifications", ownerId, wrap(setNotifications)),
      subscribeSettings(ownerId, setSettings),
    ];

    return () => unsubs.forEach((fn) => fn && fn());
  }, [ownerId]);

  return {
    members, meals, guestMeals, bazaar,
    deposits, extraCosts, notices, notifications,
    settings, loading,
  };
}
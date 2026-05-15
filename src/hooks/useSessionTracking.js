import { useEffect, useRef } from "react";

import {
  endSessionActivity,
  upsertSessionActivity,
} from "../services/firestoreService";

export function useSessionTracking(userProfile) {
  const trackedRef = useRef("");

  useEffect(() => {
    if (!userProfile?.ownerId || !userProfile?.uid) {
      return undefined;
    }

    const key = `${userProfile.ownerId}:${userProfile.uid}`;
    const firstSeen = trackedRef.current !== key;
    trackedRef.current = key;

    upsertSessionActivity(userProfile.ownerId, userProfile.uid, {
      actor: userProfile,
      logLogin: firstSeen,
    }).catch((error) => {
      console.error("session tracking:", error);
    });

    const heartbeat = window.setInterval(() => {
      upsertSessionActivity(userProfile.ownerId, userProfile.uid, {
        actor: userProfile,
      }).catch(() => {});
    }, 120000);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        upsertSessionActivity(userProfile.ownerId, userProfile.uid, {
          actor: userProfile,
        }).catch(() => {});
      }
    };

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [
    userProfile,
    userProfile?.ownerId,
    userProfile?.uid,
    userProfile?.displayName,
    userProfile?.role,
  ]);
}

export function recordSessionLogout(userProfile) {
  return endSessionActivity(
    userProfile?.ownerId,
    userProfile?.uid,
    userProfile
  );
}

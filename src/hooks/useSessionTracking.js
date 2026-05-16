import { useEffect, useRef } from "react";

import {
  endSessionActivity,
  upsertSessionActivity,
} from "../services/firestoreService";

const SESSION_STORAGE_KEY = "mm_active_session_id";
const LOGIN_LOGGED_KEY = "mm_login_logged_session_id";

function createSessionId(userProfile) {
  const randomPart =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).slice(2)}`;

  return `${userProfile.uid}_${randomPart}`;
}

function getSessionId(userProfile) {
  if (typeof sessionStorage === "undefined") {
    return createSessionId(userProfile);
  }

  const scopedKey = `${SESSION_STORAGE_KEY}_${userProfile.uid}`;
  const existing = sessionStorage.getItem(scopedKey);

  if (existing) {
    return existing;
  }

  const sessionId = createSessionId(userProfile);
  sessionStorage.setItem(scopedKey, sessionId);

  return sessionId;
}

function shouldLogLogin(sessionId) {
  if (typeof sessionStorage === "undefined") {
    return true;
  }

  if (sessionStorage.getItem(LOGIN_LOGGED_KEY) === sessionId) {
    return false;
  }

  sessionStorage.setItem(LOGIN_LOGGED_KEY, sessionId);
  return true;
}

export function useSessionTracking(userProfile) {
  const trackedRef = useRef("");

  useEffect(() => {
    if (!userProfile?.ownerId || !userProfile?.uid) {
      return undefined;
    }

    const sessionId = getSessionId(userProfile);
    const key = `${userProfile.ownerId}:${userProfile.uid}:${sessionId}`;
    const firstSeen = trackedRef.current !== key;
    trackedRef.current = key;

    upsertSessionActivity(userProfile.ownerId, userProfile.uid, {
      actor: userProfile,
      sessionId,
      logLogin: firstSeen && shouldLogLogin(sessionId),
    }).catch((error) => {
      console.error("session tracking:", error);
    });

    const heartbeat = window.setInterval(() => {
      upsertSessionActivity(userProfile.ownerId, userProfile.uid, {
        actor: userProfile,
        sessionId,
      }).catch(() => {});
    }, 120000);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        upsertSessionActivity(userProfile.ownerId, userProfile.uid, {
          actor: userProfile,
          sessionId,
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
  const sessionId =
    userProfile?.uid && typeof sessionStorage !== "undefined"
      ? sessionStorage.getItem(`${SESSION_STORAGE_KEY}_${userProfile.uid}`)
      : null;

  return endSessionActivity(
    userProfile?.ownerId,
    userProfile?.uid,
    userProfile,
    sessionId
  ).finally(() => {
    if (userProfile?.uid && typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem(`${SESSION_STORAGE_KEY}_${userProfile.uid}`);
      if (sessionId) {
        sessionStorage.removeItem(LOGIN_LOGGED_KEY);
      }
    }
  });
}

import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import {
  FieldValue,
  Timestamp,
  getFirestore,
} from "firebase-admin/firestore";
import {
  HttpsError,
  onCall,
} from "firebase-functions/v2/https";

initializeApp();

const db = getFirestore();
const auth = getAuth();

const REGION = "asia-southeast1";
const MANAGER_SESSION_LIMIT = 2;
const ACTIVE_WINDOW_MS = 2 * 60 * 1000;

function assertAuthed(request) {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Please sign in first.");
  }

  return request.auth.uid;
}

async function assertAdmin(request) {
  const uid = assertAuthed(request);
  const adminSnap = await db.doc(`adminProfiles/${uid}`).get();

  if (!adminSnap.exists) {
    throw new HttpsError("permission-denied", "Only admins can manage accounts.");
  }

  return uid;
}

function cleanAccount(account = {}) {
  const role = account.role === "manager" ? "manager" : "member";
  const status = account.status === "inactive" ? "inactive" : "active";

  return {
    name: String(account.name || account.displayName || "").trim(),
    displayName: String(account.name || account.displayName || "").trim(),
    email: String(account.email || "").trim().toLowerCase(),
    phone: String(account.phone || "").trim(),
    roomNumber: String(account.roomNumber || "").trim(),
    joinDate: account.joinDate || null,
    role,
    status,
    accountStatus: status,
  };
}

function requireAccountFields(account, needsPassword = false) {
  if (!account.name || !account.email) {
    throw new HttpsError("invalid-argument", "Name and email are required.");
  }

  if (needsPassword && !account.password) {
    throw new HttpsError("invalid-argument", "Password is required.");
  }
}

export const createManagedAccount = onCall({ region: REGION }, async (request) => {
  const ownerId = await assertAdmin(request);
  const account = cleanAccount(request.data?.account);
  const password = String(request.data?.account?.password || "");

  requireAccountFields({ ...account, password }, true);

  const user = await auth.createUser({
    email: account.email,
    password,
    displayName: account.displayName,
    disabled: account.accountStatus !== "active",
  });

  await auth.setCustomUserClaims(user.uid, {
    role: account.role,
    ownerId,
  });

  const memberRef = db.collection("members").doc();
  const accessRef = db.doc(`memberAccess/${user.uid}`);
  const payload = {
    ...account,
    ownerId,
    authUid: user.uid,
    memberId: memberRef.id,
    credentialVersion: 1,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  const batch = db.batch();
  batch.set(memberRef, payload);
  batch.set(accessRef, payload);
  await batch.commit();

  return {
    ok: true,
    uid: user.uid,
    memberId: memberRef.id,
  };
});

export const updateManagedAccount = onCall({ region: REGION }, async (request) => {
  const ownerId = await assertAdmin(request);
  const memberId = request.data?.memberId;
  const authUid = request.data?.authUid;
  const raw = request.data?.account || {};
  const account = cleanAccount(raw);

  if (!memberId || !authUid) {
    throw new HttpsError("invalid-argument", "Member and auth user are required.");
  }

  requireAccountFields(account, false);

  const memberRef = db.doc(`members/${memberId}`);
  const memberSnap = await memberRef.get();

  if (!memberSnap.exists || memberSnap.data().ownerId !== ownerId) {
    throw new HttpsError("permission-denied", "This account is outside your workspace.");
  }

  const before = memberSnap.data();
  const authUpdate = {
    email: account.email,
    displayName: account.displayName,
    disabled: account.accountStatus !== "active",
  };

  if (raw.password) {
    authUpdate.password = String(raw.password);
  }

  await auth.updateUser(authUid, authUpdate);
  await auth.setCustomUserClaims(authUid, {
    role: account.role,
    ownerId,
  });

  const credentialsChanged =
    before.email !== account.email ||
    Boolean(raw.password) ||
    before.status !== account.status ||
    before.role !== account.role;

  if (credentialsChanged) {
    await auth.revokeRefreshTokens(authUid);
  }

  const credentialVersion =
    Number(before.credentialVersion || 1) +
    (credentialsChanged ? 1 : 0);

  const payload = {
    ...account,
    ownerId,
    authUid,
    memberId,
    credentialVersion,
    updatedAt: FieldValue.serverTimestamp(),
  };

  const batch = db.batch();
  batch.set(memberRef, payload, { merge: true });
  batch.set(db.doc(`memberAccess/${authUid}`), payload, { merge: true });
  batch.set(
    db.doc(`authSessions/${authUid}`),
    {
      active: false,
      endedAt: FieldValue.serverTimestamp(),
      endedReason: "credential-update",
    },
    { merge: true }
  );
  await batch.commit();

  return {
    ok: true,
    credentialVersion,
  };
});

export const deleteManagedAccount = onCall({ region: REGION }, async (request) => {
  const ownerId = await assertAdmin(request);
  const { memberId, authUid } = request.data || {};

  if (!memberId || !authUid) {
    throw new HttpsError("invalid-argument", "Member and auth user are required.");
  }

  const memberRef = db.doc(`members/${memberId}`);
  const memberSnap = await memberRef.get();

  if (!memberSnap.exists || memberSnap.data().ownerId !== ownerId) {
    throw new HttpsError("permission-denied", "This account is outside your workspace.");
  }

  await auth.deleteUser(authUid);

  const batch = db.batch();
  batch.delete(memberRef);
  batch.delete(db.doc(`memberAccess/${authUid}`));
  batch.set(
    db.doc(`authSessions/${authUid}`),
    {
      active: false,
      endedAt: FieldValue.serverTimestamp(),
      endedReason: "account-deleted",
    },
    { merge: true }
  );
  await batch.commit();

  return { ok: true };
});

export const startManagedSession = onCall({ region: REGION }, async (request) => {
  const uid = assertAuthed(request);

  const adminSnap = await db.doc(`adminProfiles/${uid}`).get();

  if (adminSnap.exists) {
    await db.doc(`authSessions/${uid}`).set(
      {
        uid,
        ownerId: uid,
        role: "admin",
        active: true,
        startedAt: FieldValue.serverTimestamp(),
        lastSeenAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return { ok: true };
  }

  const accessSnap = await db.doc(`memberAccess/${uid}`).get();

  if (!accessSnap.exists) {
    throw new HttpsError("permission-denied", "No workspace account found.");
  }

  const access = accessSnap.data();

  if ((access.accountStatus || access.status) !== "active") {
    throw new HttpsError("failed-precondition", "This account is inactive.");
  }

  if (access.role === "manager") {
    const cutoff = Timestamp.fromMillis(Date.now() - ACTIVE_WINDOW_MS);
    const activeSnap = await db
      .collection("authSessions")
      .where("ownerId", "==", access.ownerId)
      .where("role", "==", "manager")
      .where("active", "==", true)
      .where("lastSeenAt", ">", cutoff)
      .get();

    const occupied = activeSnap.docs.filter((doc) => doc.id !== uid);

    if (occupied.length >= MANAGER_SESSION_LIMIT) {
      throw new HttpsError(
        "resource-exhausted",
        "Only 2 managers can be logged in for this workspace at the same time."
      );
    }
  }

  await db.doc(`authSessions/${uid}`).set(
    {
      uid,
      ownerId: access.ownerId,
      memberId: access.memberId,
      role: access.role,
      credentialVersion: access.credentialVersion || 1,
      active: true,
      startedAt: FieldValue.serverTimestamp(),
      lastSeenAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return { ok: true };
});

export const heartbeatManagedSession = onCall({ region: REGION }, async (request) => {
  const uid = assertAuthed(request);

  await db.doc(`authSessions/${uid}`).set(
    {
      active: true,
      lastSeenAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return { ok: true };
});

export const endManagedSession = onCall({ region: REGION }, async (request) => {
  const uid = assertAuthed(request);

  await db.doc(`authSessions/${uid}`).set(
    {
      active: false,
      endedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return { ok: true };
});

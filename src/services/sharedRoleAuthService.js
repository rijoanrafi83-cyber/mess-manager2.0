import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";

import { auth, db, firebaseConfig } from "../firebase";
import {
  ROLES,
  credentialAliasDocId,
  normalizeCredentialAlias,
} from "../utils/roles";

const SIGN_UP_URL =
  "https://identitytoolkit.googleapis.com/v1/accounts:signUp";

const SHARED_ROLES = [
  ROLES.MEMBER,
  ROLES.MANAGER,
];

const defaultSharedRoleLogin = (role) => ({
  role,
  email: "",
  password: "",
  enabled: false,
  authUid: "",
  authEmail: "",
  credentialVersion: 0,
});

const sharedAuthEmail = (ownerId, role) => {
  const random =
    crypto?.randomUUID?.() ||
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `${ownerId}.${role}.${random}@shared.messmanager.local`;
};

const createFirebaseAuthAccount = async (email, password) => {
  const response = await fetch(
    `${SIGN_UP_URL}?key=${firebaseConfig.apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
        "Could not create the shared Firebase Auth login."
    );
  }

  return data;
};

const assertWorkspaceAdmin = (ownerId) => {
  if (!auth.currentUser || auth.currentUser.uid !== ownerId) {
    throw new Error("Only the workspace admin can manage shared role logins.");
  }
};

const roleDocId = (ownerId, role) =>
  `${ownerId}_${role}`;

const cleanLogin = (role, login) => {
  if (!SHARED_ROLES.includes(role)) {
    throw new Error("Invalid shared login role.");
  }

  return {
    role,
    email: normalizeCredentialAlias(login.email),
    password: login.password || "",
    enabled: Boolean(login.enabled),
    authUid: login.authUid || "",
    authEmail: login.authEmail || "",
    credentialVersion: Number(login.credentialVersion || 0),
  };
};

export const getSharedRoleLoginSettings = async (ownerId) => {
  const pairs = await Promise.all(
    SHARED_ROLES.map(async (role) => {
      const snap = await getDoc(
        doc(db, "roleLogins", roleDocId(ownerId, role))
      );

      return [
        role,
        {
          ...defaultSharedRoleLogin(role),
          ...(snap.exists() ? snap.data() : {}),
          password: "",
        },
      ];
    })
  );

  return Object.fromEntries(pairs);
};

export const saveSharedRoleLoginSettings = async (
  ownerId,
  loginSettings
) => {
  assertWorkspaceAdmin(ownerId);

  const batch = writeBatch(db);

  for (const role of SHARED_ROLES) {
    const incoming = cleanLogin(
      role,
      loginSettings[role] || {}
    );
    const roleRef = doc(
      db,
      "roleLogins",
      roleDocId(ownerId, role)
    );
    const existingSnap = await getDoc(roleRef);
    const existing = existingSnap.exists()
      ? existingSnap.data()
      : {};
    const previousAliasKey = existing.aliasKey;
    const nextAliasKey = incoming.email
      ? credentialAliasDocId(incoming.email)
      : "";
    const passwordChanged =
      incoming.password.trim().length > 0;
    const needsAuthAccount =
      passwordChanged || !existing.authUid;

    if (incoming.enabled && !incoming.email) {
      throw new Error(
        `${role} login email is required when login is enabled.`
      );
    }

    if (incoming.password && !incoming.email) {
      throw new Error(
        `${role} login email is required when setting a password.`
      );
    }

    if (incoming.enabled && needsAuthAccount && !incoming.password) {
      throw new Error(
        `${role} login password is required the first time or when rotating credentials.`
      );
    }

    if (nextAliasKey) {
      const aliasSnap = await getDoc(
        doc(db, "roleLoginAliases", nextAliasKey)
      );

      if (
        aliasSnap.exists() &&
        aliasSnap.data().ownerId !== ownerId
      ) {
        throw new Error(
          `${incoming.email} is already used by another workspace.`
        );
      }
    }

    let authUid = existing.authUid || "";
    let authEmail = existing.authEmail || "";
    let credentialVersion =
      Number(existing.credentialVersion || 0) || Date.now();

    if (needsAuthAccount && incoming.password) {
      if (incoming.password.length < 6) {
        throw new Error(
          `${role} login password must be at least 6 characters.`
        );
      }

      const oldAuthUid = existing.authUid;
      authEmail = sharedAuthEmail(ownerId, role);
      const authAccount = await createFirebaseAuthAccount(
        authEmail,
        incoming.password
      );
      authUid = authAccount.localId;
      credentialVersion = Date.now();

      if (oldAuthUid) {
        batch.set(
          doc(db, "memberAccess", oldAuthUid),
          {
            accountStatus: "inactive",
            status: "inactive",
            rotatedTo: authUid,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }
    }

    const accountStatus =
      incoming.enabled && incoming.email && authUid
        ? "active"
        : "inactive";

    batch.set(
      roleRef,
      {
        ownerId,
        role,
        email: incoming.email,
        enabled: incoming.enabled,
        aliasKey: nextAliasKey,
        authUid,
        authEmail,
        credentialVersion,
        accountStatus,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    if (authUid) {
      batch.set(
        doc(db, "memberAccess", authUid),
        {
          ownerId,
          role,
          authUid,
          authEmail,
          email: incoming.email,
          displayName:
            role === ROLES.MANAGER
              ? "Shared Manager"
              : "Shared Member",
          sharedRole: true,
          status: accountStatus,
          accountStatus,
          credentialVersion,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }

    if (previousAliasKey && previousAliasKey !== nextAliasKey) {
      batch.delete(
        doc(db, "roleLoginAliases", previousAliasKey)
      );
    }

    if (nextAliasKey) {
      batch.set(
        doc(db, "roleLoginAliases", nextAliasKey),
        {
          ownerId,
          role,
          email: incoming.email,
          enabled: incoming.enabled,
          accountStatus,
          authUid,
          authEmail,
          credentialVersion,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }
  }

  await batch.commit();

  return getSharedRoleLoginSettings(ownerId);
};

export const removeSharedRoleAlias = (aliasKey) =>
  deleteDoc(doc(db, "roleLoginAliases", aliasKey));

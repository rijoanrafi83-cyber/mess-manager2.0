import {

  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,

  onSnapshot,
  query,
  where,

  serverTimestamp,

  getDocs,
  limit,

  writeBatch,

  getDoc,
  setDoc

} from "firebase/firestore";

import {
  db
} from "../firebase";

import {
  AUTO_MEAL_SOURCE,
  MEAL_KEYS,
  countMealUnits,
  getAutoMealId,
  getAutoMealSkipId,
  getEnabledMealKeys,
  getLocalDateKey,
  getMealKeysWithValue,
  isAutoPermanentMeal,
} from "../utils/permanentMeals";



/* =========================================================
   GENERIC HELPERS
========================================================= */

const col = (name) =>
  collection(db, name);

const docRef = (name, id) =>
  doc(db, name, id);



const ownerQuery = (
  name,
  ownerId,
  ...constraints
) =>

  query(
    col(name),
    where(
      "ownerId",
      "==",
      ownerId
    ),
    ...constraints
  );

const getDeviceInfo = () => {
  if (typeof navigator === "undefined") {
    return {
      device: "Unknown",
      browser: "Browser",
      platform: "Unknown",
    };
  }

  const ua = navigator.userAgent || "";
  const device =
    /iPad|Tablet/i.test(ua)
      ? "Tablet"
      : /Mobi|Android|iPhone/i.test(ua)
        ? "Mobile"
        : "Desktop";
  const browser =
    ua.includes("Edg/")
      ? "Microsoft Edge"
      : ua.includes("Chrome/")
        ? "Chrome"
        : ua.includes("Firefox/")
          ? "Firefox"
          : ua.includes("Safari/")
            ? "Safari"
            : "Browser";

  return {
    device,
    browser,
    platform: navigator.platform || "Unknown",
  };
};

const actorFromProfile = (actor = {}) => ({
  actorUid: actor.uid || actor.authUid || null,
  actorName:
    actor.displayName ||
    actor.fullName ||
    actor.email ||
    "Workspace user",
  actorRole: actor.role || "unknown",
});

export const addActivityLog = async (
  ownerId,
  {
    type = "activity",
    action = "updated",
    title,
    message,
    entityType = "workspace",
    entityId = null,
    actor = null,
    metadata = {},
  } = {}
) => {
  if (!ownerId) return null;

  return addDoc(col("activityLogs"), {
    ownerId,
    type,
    action,
    title: title || action,
    message: message || "",
    entityType,
    entityId,
    ...actorFromProfile(actor || {}),
    userId: actor?.uid || actor?.authUid || null,
    ...getDeviceInfo(),
    metadata,
    createdAt: serverTimestamp(),
  });
};

const notifyAndLog = async (
  ownerId,
  {
    notification,
    log,
  } = {}
) => {
  if (!ownerId) return;

  await Promise.allSettled([
    notification
      ? addNotification(ownerId, notification)
      : Promise.resolve(),
    log
      ? addActivityLog(ownerId, log)
      : Promise.resolve(),
  ]);
};



export const subscribeCollection = (

  collectionName,

  ownerId,

  callback,

  ...constraints

) => {

  const q = ownerQuery(
    collectionName,
    ownerId,
    ...constraints
  );



  return onSnapshot(

    q,

    (snap) => {

      callback(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }))
      );
    },

    (err) => {

      console.error(
        `subscribeCollection[${collectionName}]:`,
        err
      );

      callback([]);
    }
  );
};



/* =========================================================
   MEMBERS
========================================================= */

export const addMember = (
  ownerId,
  data,
  actor = null
) =>
  addDoc(
    col("members"),
    {
      ...data,
      ownerId,
      createdAt:
        serverTimestamp(),
    }
  ).then(async (ref) => {
    await notifyAndLog(ownerId, {
      notification: {
        title: "New member added",
        message: `${data.name || "A member"} joined the workspace.`,
        type: "member",
        category: "members",
      },
      log: {
        type: "member",
        action: "create",
        title: "Member created",
        message: data.name || "Member record created",
        entityType: "member",
        entityId: ref.id,
        actor,
      },
    });

    return ref;
  });



export const updateMember = (
  id,
  data,
  actor = null,
  ownerId = data?.ownerId
) =>
  updateDoc(
    docRef("members", id),
    {
      ...data,
      updatedAt:
        serverTimestamp(),
    }
  ).then(async () => {
    await notifyAndLog(ownerId, {
      log: {
        type: "member",
        action: "update",
        title: "Member updated",
        message: data.name || "Member details changed",
        entityType: "member",
        entityId: id,
        actor,
      },
    });
  });



export const deleteMember =
  async (id, actor = null, ownerId = null) => {

    // Cascade-delete related documents to prevent orphaned data
    // that would corrupt billing calculations.
    //
    // Strategy: collect all document refs to delete, then commit
    // in batches of up to 490 (under Firestore's 500-op limit).

    const refsToDelete = [docRef("members", id)];

    // Find related documents across collections.
    // All related docs use `memberId` field to reference this member.
    if (ownerId) {
      const relatedCollections = [
        "meals",
        "guestMeals",
        "deposits",
        "mealSettings",
        "autoMealSkips",
      ];

      for (const collectionName of relatedCollections) {
        const q = query(
          col(collectionName),
          where("ownerId", "==", ownerId),
          where("memberId", "==", id)
        );

        const snap = await getDocs(q);
        snap.docs.forEach((docSnap) => {
          refsToDelete.push(docSnap.ref);
        });
      }
    }

    // Commit deletes in batches of 490
    const BATCH_LIMIT = 490;
    for (let i = 0; i < refsToDelete.length; i += BATCH_LIMIT) {
      const chunk = refsToDelete.slice(i, i + BATCH_LIMIT);
      const batch = writeBatch(db);
      chunk.forEach((ref) => batch.delete(ref));
      await batch.commit();
    }

    await notifyAndLog(ownerId, {
      notification: {
        title: "Member removed",
        message: "A member and all related records were deleted from the workspace.",
        type: "member",
        category: "members",
      },
      log: {
        type: "member",
        action: "delete",
        title: "Member deleted",
        message: "Member record and related meals, deposits, and settings removed",
        entityType: "member",
        entityId: id,
        actor,
      },
    });
  };



/* =========================================================
   MEALS
========================================================= */

export const addMeal = (
  ownerId,
  data,
  actor = null
) =>
  addDoc(
    col("meals"),
    {

      ...data,

      ownerId,

      createdAt:
        serverTimestamp(),

      totalMeals:
        Number(
          data.breakfast || 0
        ) *
          0.5 +

        Number(
          data.lunch || 0
        ) +

        Number(
          data.dinner || 0
        ),
    }
  ).then(async (ref) => {
    await notifyAndLog(ownerId, {
      notification: {
        title: "Meal updated",
        message: `Meal entry saved for ${data.date || "today"}.`,
        type: "meal",
        category: "meals",
      },
      log: {
        type: "meal",
        action: "create",
        title: "Meal added",
        message: `Meal entry for ${data.date || "selected date"}`,
        entityType: "meal",
        entityId: ref.id,
        actor,
      },
    });

    return ref;
  });



export const updateMeal = (
  id,
  data,
  actor = null,
  ownerId = data?.ownerId
) =>

  updateDoc(
    docRef("meals", id),
    {

      ...data,

      manualOverride:
        data.autoGenerated || data.source === AUTO_MEAL_SOURCE
          ? true
          : data.manualOverride || false,

      totalMeals:
        Number(
          data.breakfast || 0
        ) *
          0.5 +

        Number(
          data.lunch || 0
        ) +

        Number(
          data.dinner || 0
        ),

      updatedAt:
        serverTimestamp(),
    }
  ).then(async () => {
    await notifyAndLog(ownerId, {
      notification: {
        title: "Meal changed",
        message: `Meal entry updated for ${data.date || "a date"}.`,
        type: "meal",
        category: "meals",
      },
      log: {
        type: "meal",
        action: "update",
        title: "Meal updated",
        message: `Meal entry updated for ${data.date || "selected date"}`,
        entityType: "meal",
        entityId: id,
        actor,
      },
    });
  });



export const deleteMeal = (
  id,
  actor = null,
  ownerId = null
) =>

  deleteDoc(
    docRef("meals", id)
  ).then(async () => {
    await notifyAndLog(ownerId, {
      log: {
        type: "meal",
        action: "delete",
        title: "Meal deleted",
        message: "Meal entry removed",
        entityType: "meal",
        entityId: id,
        actor,
      },
    });
  });


export const deleteMealWithAutoSkip =
  async (
    ownerId,
    meal,
    actor = null
  ) => {

    if (
      ownerId &&
      meal?.id &&
      isAutoPermanentMeal(meal)
    ) {

      const mealKeys =
        getMealKeysWithValue(meal);
      const skippedKeys =
        mealKeys.length
          ? mealKeys
          : MEAL_KEYS;

      await setDoc(
        docRef(
          "autoMealSkips",
          getAutoMealSkipId(
            ownerId,
            meal.memberId,
            meal.date
          )
        ),
        {
          ownerId,
          memberId:
            meal.memberId,
          date:
            meal.date,
          skippedMeals:
            skippedKeys.reduce(
              (acc, key) => ({
                ...acc,
                [key]: true,
              }),
              {}
            ),
          sourceMealId:
            meal.id,
          updatedAt:
            serverTimestamp(),
        },
        { merge: true }
      );
    }

    return deleteMeal(
      meal.id || meal,
      actor,
      ownerId
    );
  };


export const ensureDailyPermanentMeals =
  async ({
    ownerId,
    members = [],
    meals = [],
    mealSettings = [],
    date = getLocalDateKey(),
  }) => {

    if (!ownerId) return 0;

    const activeMembers =
      members.filter(
        (member) =>
          member.status !==
          "inactive"
      );

    if (
      !activeMembers.length ||
      !mealSettings.length
    ) {
      return 0;
    }

    const skipSnap =
      await getDocs(
        query(
          col("autoMealSkips"),
          where("ownerId", "==", ownerId),
          where("date", "==", date)
        )
      );

    const skipMap =
      new Map(
        skipSnap.docs.map((d) => [
          d.data().memberId,
          d.data().skippedMeals || {},
        ])
      );

    const batch =
      writeBatch(db);

    let writes = 0;

    activeMembers.forEach((member) => {
      const setting =
        mealSettings.find(
          (item) =>
            item.memberId ===
            member.id
        );

      const enabled =
        getEnabledMealKeys(setting);

      if (!enabled.length) return;

      const todayMeals =
        meals.filter(
          (meal) =>
            meal.memberId === member.id &&
            meal.date === date
        );

      if (
        todayMeals.some(
          (meal) =>
            meal.manualOverride === true
        )
      ) {
        return;
      }

      const skipped =
        skipMap.get(member.id) ||
        {};

      const existingAuto =
        todayMeals.find(
          (meal) =>
            meal.id ===
              getAutoMealId(
                ownerId,
                member.id,
                date
              ) ||
            isAutoPermanentMeal(meal)
        );

      const missing =
        enabled.filter((key) => {
          if (skipped[key]) return false;

          return !todayMeals.some(
            (meal) =>
              Number(
                meal[key] || 0
              ) > 0
          );
        });

      if (!missing.length) return;

      const autoMeal = {
        breakfast:
          Number(
            existingAuto?.breakfast ||
              0
          ),
        lunch:
          Number(
            existingAuto?.lunch ||
              0
          ),
        dinner:
          Number(
            existingAuto?.dinner ||
              0
          ),
      };

      missing.forEach((key) => {
        autoMeal[key] = 1;
      });

      batch.set(
        docRef(
          "meals",
          getAutoMealId(
            ownerId,
            member.id,
            date
          )
        ),
        {
          ownerId,
          memberId:
            member.id,
          date,
          breakfast:
            autoMeal.breakfast,
          lunch:
            autoMeal.lunch,
          dinner:
            autoMeal.dinner,
          totalMeals:
            countMealUnits(
              autoMeal
            ),
          autoGenerated: true,
          source:
            AUTO_MEAL_SOURCE,
          manualOverride: false,
          autoGeneratedAt:
            serverTimestamp(),
          updatedAt:
            serverTimestamp(),
        },
        { merge: true }
      );

      writes++;
    });

    if (!writes) return 0;

    await batch.commit();

    return writes;
  };



/* =========================================================
   GUEST MEALS
========================================================= */

export const addGuestMeal = (
  ownerId,
  data,
  actor = null
) =>

  addDoc(
    col("guestMeals"),
    {

      ...data,

      ownerId,

      createdAt:
        serverTimestamp(),

      totalGuestMeals:
        Number(
          data.breakfast || 0
        ) *
          0.5 +

        Number(
          data.lunch || 0
        ) +

        Number(
          data.dinner || 0
        ),
    }
  ).then(async (ref) => {
    await notifyAndLog(ownerId, {
      notification: {
        title: "Guest meal added",
        message: `Guest meal saved for ${data.date || "today"}.`,
        type: "meal",
        category: "meals",
      },
      log: {
        type: "meal",
        action: "create",
        title: "Guest meal added",
        message: `Guest meal for ${data.date || "selected date"}`,
        entityType: "guestMeal",
        entityId: ref.id,
        actor,
      },
    });

    return ref;
  });



export const updateGuestMeal = (
  id,
  data,
  actor = null,
  ownerId = data?.ownerId
) =>

  updateDoc(
    docRef(
      "guestMeals",
      id
    ),
    {
      ...data,
      updatedAt:
        serverTimestamp(),
    }
  ).then(async () => {
    await notifyAndLog(ownerId, {
      log: {
        type: "meal",
        action: "update",
        title: "Guest meal updated",
        message: `Guest meal updated for ${data.date || "selected date"}`,
        entityType: "guestMeal",
        entityId: id,
        actor,
      },
    });
  });



export const deleteGuestMeal = (
  id,
  actor = null,
  ownerId = null
) =>

  deleteDoc(
    docRef(
      "guestMeals",
      id
    )
  ).then(async () => {
    await notifyAndLog(ownerId, {
      log: {
        type: "meal",
        action: "delete",
        title: "Guest meal deleted",
        message: "Guest meal entry removed",
        entityType: "guestMeal",
        entityId: id,
        actor,
      },
    });
  });



/* =========================================================
   PERMANENT MEAL SETTINGS
========================================================= */

export const saveMealSettings = (

  ownerId,

  memberId,

  data,
  actor = null

) =>

  setDoc(

    docRef(
      "mealSettings",
      `${ownerId}_${memberId}`
    ),

    {

      ownerId,

      memberId,

      ...data,

      updatedAt:
        serverTimestamp(),
    },

    { merge: true }
  ).then(async () => {
    await notifyAndLog(ownerId, {
      log: {
        type: "meal",
        action: "settings",
        title: "Permanent meals changed",
        message: "Meal automation settings updated",
        entityType: "mealSettings",
        entityId: `${ownerId}_${memberId}`,
        actor,
      },
    });
  });



export const subscribeMealSettings = (

  ownerId,

  callback

) => {

  const q = ownerQuery(
    "mealSettings",
    ownerId
  );



  return onSnapshot(
    q,
    (snap) => {

      callback(

        snap.docs.map((d) => ({

          id: d.id,

          ...d.data(),

        }))
      );
    }
  );
};



/* =========================================================
   BAZAAR
========================================================= */

export const addBazaar =
  async (

    ownerId,

    data,

    receiptFile = null,

    actor = null

  ) => {

    let receiptURL = null;

    if (receiptFile) {
      console.warn(
        "Receipt file upload skipped: Firebase Storage is disabled for Spark compatibility."
      );
    }



    const ref = await addDoc(
      col("bazaar"),
      {

        ...data,

        ownerId,

        receiptURL,

        createdAt:
          serverTimestamp(),
      }
    );

    await notifyAndLog(ownerId, {
      notification: {
        title: "Bazaar added",
        message: `${data.title || "Bazaar expense"} saved.`,
        type: "bazaar",
        category: "expenses",
      },
      log: {
        type: "bazaar",
        action: "create",
        title: "Bazaar added",
        message: data.title || "Bazaar expense created",
        entityType: "bazaar",
        entityId: ref.id,
        actor,
      },
    });

    return ref;
  };



export const updateBazaar = (
  id,
  data,
  actor = null,
  ownerId = data?.ownerId
) =>

  updateDoc(
    docRef("bazaar", id),
    {
      ...data,
      updatedAt:
        serverTimestamp(),
    }
  ).then(async () => {
    await notifyAndLog(ownerId, {
      log: {
        type: "bazaar",
        action: "update",
        title: "Bazaar changed",
        message: data.title || "Bazaar expense updated",
        entityType: "bazaar",
        entityId: id,
        actor,
      },
    });
  });



export const deleteBazaar = (
  id,
  actor = null,
  ownerId = null
) =>

  deleteDoc(
    docRef("bazaar", id)
  ).then(async () => {
    await notifyAndLog(ownerId, {
      log: {
        type: "bazaar",
        action: "delete",
        title: "Bazaar deleted",
        message: "Bazaar expense removed",
        entityType: "bazaar",
        entityId: id,
        actor,
      },
    });
  });



/* =========================================================
   DEPOSITS
========================================================= */

export const addDeposit = (
  ownerId,
  data,
  actor = null
) =>

  addDoc(
    col("deposits"),
    {
      ...data,
      ownerId,
      createdAt:
        serverTimestamp(),
    }
  ).then(async (ref) => {
    await notifyAndLog(ownerId, {
      notification: {
        title: "Deposit added",
        message: `Deposit of ${data.amount || 0} saved.`,
        type: "deposit",
        category: "deposits",
      },
      log: {
        type: "deposit",
        action: "create",
        title: "Deposit added",
        message: `Deposit of ${data.amount || 0}`,
        entityType: "deposit",
        entityId: ref.id,
        actor,
      },
    });

    return ref;
  });



export const updateDeposit = (
  id,
  data,
  actor = null,
  ownerId = data?.ownerId
) =>

  updateDoc(
    docRef("deposits", id),
    {
      ...data,
      updatedAt:
        serverTimestamp(),
    }
  ).then(async () => {
    await notifyAndLog(ownerId, {
      log: {
        type: "deposit",
        action: "update",
        title: "Deposit changed",
        message: `Deposit updated (${data.amount || 0})`,
        entityType: "deposit",
        entityId: id,
        actor,
      },
    });
  });



export const deleteDeposit = (
  id,
  actor = null,
  ownerId = null
) =>

  deleteDoc(
    docRef("deposits", id)
  ).then(async () => {
    await notifyAndLog(ownerId, {
      log: {
        type: "deposit",
        action: "delete",
        title: "Deposit deleted",
        message: "Deposit record removed",
        entityType: "deposit",
        entityId: id,
        actor,
      },
    });
  });



/* =========================================================
   EXTRA COSTS
========================================================= */

export const addExtraCost = (
  ownerId,
  data
) =>

  addDoc(
    col("extraCosts"),
    {
      ...data,
      ownerId,
      createdAt:
        serverTimestamp(),
    }
  );



export const deleteExtraCost = (
  id
) =>

  deleteDoc(
    docRef(
      "extraCosts",
      id
    )
  );



/* =========================================================
   NOTICES
========================================================= */

export const addNotice = (
  ownerId,
  data
) =>

  addDoc(
    col("notices"),
    {
      ...data,
      ownerId,
      createdAt:
        serverTimestamp(),
    }
  );



export const deleteNotice = (
  id
) =>

  deleteDoc(
    docRef("notices", id)
  );



/* =========================================================
   NOTIFICATIONS
========================================================= */

export const addNotification = (

  ownerId,

  {
    title,
    message,
    type = "info",
    category = "general",
    metadata = {}
  }

) =>

  addDoc(
    col("notifications"),
    {

      ownerId,

      title,

      message,

      type,

      category,

      metadata,

      read: false,

      createdAt:
        serverTimestamp(),
    }
  );



export const markNotificationRead = (
  id
) =>

  updateDoc(
    docRef(
      "notifications",
      id
    ),
    {
      read: true,
    }
  );

export const clearNotifications =
  async (ownerId) => {
    if (!ownerId) return;

    let deleted = 0;

    do {
      const q = ownerQuery(
        "notifications",
        ownerId,
        limit(40)
      );

      const snap = await getDocs(q);
      deleted = snap.size;

      if (!deleted) return;

      const batch = writeBatch(db);

      snap.docs.forEach((d) =>
        batch.delete(d.ref)
      );

      await batch.commit();
    } while (deleted === 40);
  };



export const markAllNotificationsRead =
  async (ownerId) => {

    const q = ownerQuery(

      "notifications",

      ownerId,

      where(
        "read",
        "==",
        false
      )
    );



    const snap =
      await getDocs(q);

    const batch =
      writeBatch(db);



    snap.docs.forEach((d) =>

      batch.update(d.ref, {
        read: true,
      })
    );



    await batch.commit();
  };



/* =========================================================
   SETTINGS
========================================================= */

export const getSettings =
  async (ownerId) => {

    const ref = docRef(
      "settings",
      ownerId
    );

    const snap =
      await getDoc(ref);

    return snap.exists()
      ? snap.data()
      : null;
  };



export const updateSettings = (
  ownerId,
  data,
  actor = null
) =>

  setDoc(

    docRef(
      "settings",
      ownerId
    ),

    {
      ownerId,
      ...data,
      updatedAt:
        serverTimestamp(),
    },

    { merge: true }
  ).then(async () => {
    await notifyAndLog(ownerId, {
      log: {
        type: "settings",
        action: "update",
        title: "Settings updated",
        message: "Workspace settings changed",
        entityType: "settings",
        entityId: ownerId,
        actor,
      },
    });
  });



export const subscribeSettings = (

  ownerId,

  callback

) =>

  onSnapshot(

    docRef(
      "settings",
      ownerId
    ),

    (snap) => {

      callback(
        snap.exists()
          ? snap.data()
          : null
      );
    }
  );

/* =========================================================
   SESSION ACTIVITY
========================================================= */

export const upsertSessionActivity =
  async (ownerId, userId, data = {}) => {
    if (!ownerId || !userId) return null;

    const sessionId =
      data.sessionId ||
      `${userId}_${new Date().toISOString().slice(0, 10)}`;

    await setDoc(
      docRef("sessionActivity", sessionId),
      {
        ownerId,
        userId,
        sessionId,
        ...actorFromProfile(data.actor || {}),
        ...getDeviceInfo(),
        status: data.status || "active",
        lastSeenAt: serverTimestamp(),
        loginAt: data.loginAt || serverTimestamp(),
        createdAt: data.loginAt || serverTimestamp(),
        logoutAt: data.logoutAt || null,
      },
      { merge: true }
    );

    if (data.logLogin) {
      await notifyAndLog(ownerId, {
        notification: {
          title: "Login activity",
          message: `${data.actor?.displayName || data.actor?.email || "A user"} signed in.`,
          type: "login",
          category: "security",
        },
        log: {
          type: "security",
          action: "login",
          title: "User login",
          message: "Session started",
          entityType: "session",
          entityId: sessionId,
          actor: data.actor,
        },
      });
    }

    return sessionId;
  };

export const endSessionActivity =
  async (ownerId, userId, actor = null, sessionId = null) => {
    if (!ownerId || !userId) return;

    const activeSessionId =
      sessionId ||
      `${userId}_${new Date().toISOString().slice(0, 10)}`;

    await setDoc(
      docRef("sessionActivity", activeSessionId),
      {
        ownerId,
        userId,
        sessionId: activeSessionId,
        ...actorFromProfile(actor || {}),
        ...getDeviceInfo(),
        status: "signed-out",
        logoutAt: serverTimestamp(),
        lastSeenAt: serverTimestamp(),
      },
      { merge: true }
    );

    await addActivityLog(ownerId, {
      type: "security",
      action: "logout",
      title: "User logout",
      message: "Session ended",
      entityType: "session",
      entityId: activeSessionId,
      actor,
    });
  };



/* =========================================================
   MONTHLY REPORTS
========================================================= */

export const saveMonthlyReport = (

  ownerId,

  month,

  data

) =>

  setDoc(

    docRef(
      "monthlyReports",
      `${ownerId}_${month}`
    ),

    {

      ...data,

      ownerId,

      month,

      savedAt:
        serverTimestamp(),
    },

    { merge: true }
  );



export const getMonthlyReport =
  async (
    ownerId,
    month
  ) => {

    const snap =
      await getDoc(

        docRef(
          "monthlyReports",
          `${ownerId}_${month}`
        )
      );

    return snap.exists()
      ? snap.data()
      : null;
  };

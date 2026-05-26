import {
  useEffect,
  useState
} from "react";

import {
  where
} from "firebase/firestore";

import {

  subscribeCollection,

  subscribeSettings,

  subscribeMealSettings

} from "../services/firestoreService";



export function useMessData(
  ownerId,
  userProfile = null
) {

  const [members, setMembers] =
    useState([]);

  const [meals, setMeals] =
    useState([]);

  const [
    guestMeals,
    setGuestMeals
  ] = useState([]);

  const [
    mealSettings,
    setMealSettings
  ] = useState([]);

  const [bazaar, setBazaar] =
    useState([]);

  const [
    deposits,
    setDeposits
  ] = useState([]);

  const [
    extraCosts,
    setExtraCosts
  ] = useState([]);

  const [notices, setNotices] =
    useState([]);

  const [
    notifications,
    setNotifications
  ] = useState([]);

  const [
    activityLogs,
    setActivityLogs
  ] = useState([]);

  const [
    sessionActivity,
    setSessionActivity
  ] = useState([]);

  const [settings, setSettings] =
    useState(null);

  const [loading, setLoading] =
    useState(true);



  useEffect(() => {

    if (!ownerId) {

      let active = true;

      queueMicrotask(() => {
        if (active) setLoading(false);
      });

      return () => {
        active = false;
      };
    }



    const isPersonalMember =
      userProfile?.role === "member" &&
      Boolean(userProfile?.memberId);

    const memberId =
      userProfile?.memberId;

    let loadCount = 0;

    const total = 12;



    const onLoad = () => {

      loadCount++;

      if (loadCount >= total) {

        setLoading(false);
      }
    };



    const wrap =
      (setter) =>
      (data) => {

        setter(data);

        onLoad();
      };

    const empty = (setter) => {
      setter([]);
      onLoad();
      return undefined;
    };



    const unsubs = [
      isPersonalMember
        ? subscribeCollection(
            "members",
            ownerId,
            wrap(setMembers),
            where("authUid", "==", userProfile.uid)
          )
        : subscribeCollection(
            "members",
            ownerId,
            wrap(setMembers)
          ),
      isPersonalMember
        ? subscribeCollection(
            "meals",
            ownerId,
            wrap(setMeals),
            where("memberId", "==", memberId)
          )
        : subscribeCollection(
            "meals",
            ownerId,
            wrap(setMeals)
          ),
      isPersonalMember
        ? empty(setGuestMeals)
        : subscribeCollection(
            "guestMeals",
            ownerId,
            wrap(setGuestMeals)
          ),
      isPersonalMember
        ? subscribeCollection(
            "mealSettings",
            ownerId,
            wrap(setMealSettings),
            where("memberId", "==", memberId)
          )
        : subscribeMealSettings(
            ownerId,
            wrap(setMealSettings)
          ),
      isPersonalMember
        ? empty(setBazaar)
        : subscribeCollection(
            "bazaar",
            ownerId,
            wrap(setBazaar)
          ),
      isPersonalMember
        ? subscribeCollection(
            "deposits",
            ownerId,
            wrap(setDeposits),
            where("memberId", "==", memberId)
          )
        : subscribeCollection(
            "deposits",
            ownerId,
            wrap(setDeposits)
          ),
      isPersonalMember
        ? empty(setExtraCosts)
        : subscribeCollection(
            "extraCosts",
            ownerId,
            wrap(setExtraCosts)
          ),
      isPersonalMember
        ? empty(setNotices)
        : subscribeCollection(
            "notices",
            ownerId,
            wrap(setNotices)
          ),
      isPersonalMember
        ? empty(setNotifications)
        : subscribeCollection(
            "notifications",
            ownerId,
            (data) =>
              wrap(setNotifications)(
                data
                  .sort(
                    (a, b) =>
                      (b.createdAt?.seconds || 0) -
                      (a.createdAt?.seconds || 0)
                  )
                  .slice(0, 30)
              )
          ),
      isPersonalMember
        ? empty(setActivityLogs)
        : subscribeCollection(
            "activityLogs",
            ownerId,
            (data) =>
              wrap(setActivityLogs)(
                data
                  .sort(
                    (a, b) =>
                      (b.createdAt?.seconds || 0) -
                      (a.createdAt?.seconds || 0)
                  )
                  .slice(0, 80)
              )
          ),
      isPersonalMember
        ? empty(setSessionActivity)
        : subscribeCollection(
            "sessionActivity",
            ownerId,
            (data) =>
              wrap(setSessionActivity)(
                data
                  .sort(
                    (a, b) =>
                      (b.lastSeenAt?.seconds || 0) -
                      (a.lastSeenAt?.seconds || 0)
                  )
                  .slice(0, 20)
              )
          ),
      subscribeSettings(
        ownerId,
        wrap(setSettings)
      ),
    ];



    return () => {

      unsubs.forEach(
        (fn) => fn && fn()
      );
    };

  }, [
    ownerId,
    userProfile?.uid,
    userProfile?.role,
    userProfile?.memberId,
  ]);



  return {

    members,

    meals,

    guestMeals,

    mealSettings,

    bazaar,

    deposits,

    extraCosts,

    notices,

    notifications,

    activityLogs,

    sessionActivity,

    settings,

    loading,
  };
}

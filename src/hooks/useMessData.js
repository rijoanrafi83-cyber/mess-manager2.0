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

  const [settings, setSettings] =
    useState(null);

  const [loading, setLoading] =
    useState(true);



  useEffect(() => {

    if (!ownerId) {

      setLoading(false);

      return;
    }



    const isPersonalMember =
      userProfile?.role === "member" &&
      Boolean(userProfile?.memberId);

    const memberId =
      userProfile?.memberId;

    let loadCount = 0;

    const total = 10;



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

      /* =========================================
         MEMBERS
      ========================================= */

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



      /* =========================================
         MEALS
      ========================================= */

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



      /* =========================================
         GUEST MEALS
      ========================================= */

      isPersonalMember
        ? empty(setGuestMeals)
        : subscribeCollection(
            "guestMeals",
            ownerId,
            wrap(setGuestMeals)
          ),



      /* =========================================
         PERMANENT MEAL SETTINGS
      ========================================= */

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



      /* =========================================
         BAZAAR
      ========================================= */

      isPersonalMember
        ? empty(setBazaar)
        : subscribeCollection(
            "bazaar",
            ownerId,
            wrap(setBazaar)
          ),



      /* =========================================
         DEPOSITS
      ========================================= */

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



      /* =========================================
         EXTRA COSTS
      ========================================= */

      isPersonalMember
        ? empty(setExtraCosts)
        : subscribeCollection(
            "extraCosts",
            ownerId,
            wrap(setExtraCosts)
          ),



      /* =========================================
         NOTICES
      ========================================= */

      isPersonalMember
        ? empty(setNotices)
        : subscribeCollection(
            "notices",
            ownerId,
            wrap(setNotices)
          ),



      /* =========================================
         NOTIFICATIONS
      ========================================= */

      isPersonalMember
        ? empty(setNotifications)
        : subscribeCollection(
            "notifications",
            ownerId,
            wrap(setNotifications)
          ),



      /* =========================================
         SETTINGS
      ========================================= */

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

    settings,

    loading,
  };
}

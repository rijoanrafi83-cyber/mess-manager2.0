import {
  useEffect,
  useState
} from "react";

import {

  subscribeCollection,

  subscribeSettings,

  subscribeMealSettings

} from "../services/firestoreService";



export function useMessData(
  ownerId
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



    const unsubs = [

      /* =========================================
         MEMBERS
      ========================================= */

      subscribeCollection(
        "members",
        ownerId,
        wrap(setMembers)
      ),



      /* =========================================
         MEALS
      ========================================= */

      subscribeCollection(
        "meals",
        ownerId,
        wrap(setMeals)
      ),



      /* =========================================
         GUEST MEALS
      ========================================= */

      subscribeCollection(
        "guestMeals",
        ownerId,
        wrap(setGuestMeals)
      ),



      /* =========================================
         PERMANENT MEAL SETTINGS
      ========================================= */

      subscribeMealSettings(
        ownerId,
        wrap(setMealSettings)
      ),



      /* =========================================
         BAZAAR
      ========================================= */

      subscribeCollection(
        "bazaar",
        ownerId,
        wrap(setBazaar)
      ),



      /* =========================================
         DEPOSITS
      ========================================= */

      subscribeCollection(
        "deposits",
        ownerId,
        wrap(setDeposits)
      ),



      /* =========================================
         EXTRA COSTS
      ========================================= */

      subscribeCollection(
        "extraCosts",
        ownerId,
        wrap(setExtraCosts)
      ),



      /* =========================================
         NOTICES
      ========================================= */

      subscribeCollection(
        "notices",
        ownerId,
        wrap(setNotices)
      ),



      /* =========================================
         NOTIFICATIONS
      ========================================= */

      subscribeCollection(
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

  }, [ownerId]);



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
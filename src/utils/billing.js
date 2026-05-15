// =========================================================
// MEAL WEIGHTS
// =========================================================

const MEAL_WEIGHT = {
  breakfast: 0.5,
  lunch: 1,
  dinner: 1,
};



// =========================================================
// SINGLE MEAL COUNT
// =========================================================

export function calculateMealCount(
  meal
) {

  return (

    Number(
      meal.breakfast || 0
    ) *
      MEAL_WEIGHT.breakfast +

    Number(
      meal.lunch || 0
    ) *
      MEAL_WEIGHT.lunch +

    Number(
      meal.dinner || 0
    ) *
      MEAL_WEIGHT.dinner
  );
}



// =========================================================
// GUEST MEAL COUNT
// =========================================================

export function calculateGuestMealCount(
  meal
) {

  return (

    Number(
      meal.breakfast || 0
    ) *
      MEAL_WEIGHT.breakfast +

    Number(
      meal.lunch || 0
    ) *
      MEAL_WEIGHT.lunch +

    Number(
      meal.dinner || 0
    ) *
      MEAL_WEIGHT.dinner
  );
}



// =========================================================
// MONTHLY BILL CALCULATION
// =========================================================

export function calculateMonthlyBill(

  members = [],

  meals = [],

  guestMeals = [],

  mealSettings = [],

  bazaar = [],

  deposits = [],

  extraCosts = []
) {
  void mealSettings;

  // =====================================================
  // EXPENSES
  // =====================================================

  const totalBazaar =
    bazaar.reduce(
      (s, b) =>
        s +
        Number(b.amount || 0),
      0
    );



  const totalExtra =
    extraCosts.reduce(
      (s, e) =>
        s +
        Number(e.amount || 0),
      0
    );



  const grandExpense =
    totalBazaar +
    totalExtra;



  // =====================================================
  // MAPS
  // =====================================================

  const mealMap = {};

  const depositMap = {};



  members.forEach((m) => {

    mealMap[m.id] = 0;

    depositMap[m.id] = 0;

  });



  // =====================================================
  // NORMAL MEALS
  // =====================================================

  meals.forEach((meal) => {

    const count =
      calculateMealCount(
        meal
      );

    if (
      mealMap[
        meal.memberId
      ] !== undefined
    ) {

      mealMap[
        meal.memberId
      ] += count;

    } else {

      mealMap[
        meal.memberId
      ] = count;
    }
  });



  // =====================================================
  // GUEST MEALS
  // HOST MEMBER এর সাথে ADD হবে
  // =====================================================

  guestMeals.forEach(
    (meal) => {

      const count =
        calculateGuestMealCount(
          meal
        );

      if (
        mealMap[
          meal.memberId
        ] !== undefined
      ) {

        mealMap[
          meal.memberId
        ] += count;

      } else {

        mealMap[
          meal.memberId
        ] = count;
      }
    }
  );



  // =====================================================
  // DEPOSITS
  // =====================================================

  deposits.forEach((d) => {

    if (
      depositMap[
        d.memberId
      ] !== undefined
    ) {

      depositMap[
        d.memberId
      ] += Number(
        d.amount || 0
      );

    } else {

      depositMap[
        d.memberId
      ] = Number(
        d.amount || 0
      );
    }
  });



  // =====================================================
  // TOTALS
  // =====================================================

  const totalMeals =
    Object.values(
      mealMap
    ).reduce(
      (s, v) => s + v,
      0
    );



  const mealRate =
    totalMeals > 0
      ? grandExpense /
        totalMeals
      : 0;



  const totalDeposits =
    Object.values(
      depositMap
    ).reduce(
      (s, v) => s + v,
      0
    );



  // =====================================================
  // MEMBER BILLS
  // =====================================================

  const memberBills =
    members.map((m) => {

      const meals =
        mealMap[m.id] || 0;

      const deposit =
        depositMap[m.id] || 0;

      const total =
        meals * mealRate;

      const due =
        total - deposit;

      return {

        ...m,

        meals,

        deposit,

        mealCost: total,

        total,

        due,

        balance:
          deposit - total,

        mealRate,
      };
    });



  // =====================================================
  // TOTAL DUE
  // =====================================================

  const totalDue =
    memberBills.reduce(
      (s, mb) =>
        s +
        Math.max(
          0,
          mb.due
        ),
      0
    );



  // =====================================================
  // RETURN
  // =====================================================

  return {

    memberBills,

    totalBazaar,

    totalExtra,

    grandExpense,

    totalMeals,

    totalDeposits,

    totalDue,

    mealRate,

    totalGuestMeals:
      guestMeals.reduce(
        (s, g) =>
          s +
          calculateGuestMealCount(
            g
          ),
        0
      ),
  };
}



// =========================================================
// FORMAT CURRENCY
// =========================================================

export function formatCurrency(

  amount,

  symbol = "৳"
) {

  if (
    amount === undefined ||
    amount === null
  ) {

    return `${symbol}0`;
  }

  return `${symbol}${Number(
    amount
  ).toLocaleString(
    "en-BD",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }
  )}`;
}



// =========================================================
// MEAL RATE COLOR
// =========================================================

export function getMealRateColor(
  rate
) {

  if (rate < 30) {
    return "text-green-500";
  }

  if (rate < 50) {
    return "text-yellow-500";
  }

  return "text-red-500";
}



// =========================================================
// GROUP BAZAAR BY CATEGORY
// =========================================================

export function groupBazaarByCategory(
  bazaar = []
) {

  return bazaar.reduce(
    (acc, item) => {

      const cat =
        item.category ||
        "Other";

      acc[cat] =
        (acc[cat] || 0) +
        Number(
          item.amount || 0
        );

      return acc;

    },
    {}
  );
}



// =========================================================
// MEAL TREND
// =========================================================

export function getMealTrend(

  meals = [],

  days = 7
) {

  const now = new Date();

  const result = [];



  for (
    let i = days - 1;
    i >= 0;
    i--
  ) {

    const d =
      new Date(now);

    d.setDate(
      d.getDate() - i
    );

    const key = d
      .toISOString()
      .split("T")[0];



    const dayMeals =
      meals.filter(
        (m) =>
          m.date === key
      );



    const total =
      dayMeals.reduce(
        (s, m) =>
          s +
          calculateMealCount(
            m
          ),
        0
      );



    result.push({

      date: key,

      label:
        d.toLocaleDateString(
          "en-BD",
          {
            weekday: "short",
          }
        ),

      meals: total,
    });
  }

  return result;
}

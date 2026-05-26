const MEAL_WEIGHT = {
  breakfast: 0.5,
  lunch: 1,
  dinner: 1,
};
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
        Number(e.totalAmount || e.amount || 0),
      0
    );

  // Meal rate is based on bazaar only — extra bills are charged
  // per-member based on their inclusion in selectedMemberIds.
  const grandExpense = totalBazaar;
  const mealMap = {};

  const depositMap = {};

  members.forEach((m) => {

    mealMap[m.id] = 0;

    depositMap[m.id] = 0;

  });
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
  const activeMembers = members.filter((m) => m.status !== "inactive");
  const activeMemberIds = activeMembers.map((m) => m.id);

  const extraShareMap = {};
  const extraBreakdownMap = {};

  members.forEach((m) => {
    extraShareMap[m.id] = 0;
    extraBreakdownMap[m.id] = [];
  });

  extraCosts.forEach((bill) => {
    const billingMode = bill.billingMode || "total_shared";
    const amount = Number(bill.totalAmount || bill.amount || 0);
    // For legacy docs without selectedMemberIds, include all active members
    const selectedIds = (bill.selectedMemberIds && bill.selectedMemberIds.length > 0)
      ? bill.selectedMemberIds
      : activeMemberIds;
    const memberCount = selectedIds.length || 1;

    let memberShare;
    let totalAmount;

    if (billingMode === "per_member_unit") {
      // Per member unit: amount is per-member, total = amount × count
      memberShare = Number(bill.amount || 0);
      totalAmount = memberShare * memberCount;
    } else {
      // Total shared: amount is the total, split equally
      totalAmount = amount;
      memberShare = Math.round((totalAmount / memberCount) * 100) / 100;
    }

    selectedIds.forEach((memberId) => {
      if (extraShareMap[memberId] !== undefined) {
        extraShareMap[memberId] += memberShare;
        extraBreakdownMap[memberId].push({
          title: bill.title || "Extra bill",
          category: bill.category || "other",
          share: memberShare,
          totalAmount,
          billingMode,
        });
      }
    });
  });
  const memberBills =
    members.map((m) => {

      const memberMeals =
        mealMap[m.id] || 0;

      const deposit =
        depositMap[m.id] || 0;

      const mealCost =
        memberMeals * mealRate;

      const extraBillsTotal =
        Math.round((extraShareMap[m.id] || 0) * 100) / 100;

      const total =
        mealCost + extraBillsTotal;

      const due =
        total - deposit;

      return {

        ...m,

        meals: memberMeals,

        deposit,

        deposits:
          deposit,

        mealCost,

        extraBillsTotal,

        extraBillsBreakdown:
          extraBreakdownMap[m.id] || [],

        total,

        due,

        balance:
          deposit - total,

        mealRate,
      };
    });
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

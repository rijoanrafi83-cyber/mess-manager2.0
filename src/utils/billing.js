// Meal weights
const MEAL_WEIGHT = { breakfast: 0.5, lunch: 1, dinner: 1 };

export function calculateMealCount(meal) {
  return (
    Number(meal.breakfast || 0) * MEAL_WEIGHT.breakfast +
    Number(meal.lunch     || 0) * MEAL_WEIGHT.lunch     +
    Number(meal.dinner    || 0) * MEAL_WEIGHT.dinner
  );
}

export function calculateGuestMealCount(meal) {
  return (
    Number(meal.breakfast || 0) * MEAL_WEIGHT.breakfast +
    Number(meal.lunch     || 0) * MEAL_WEIGHT.lunch     +
    Number(meal.dinner    || 0) * MEAL_WEIGHT.dinner
  );
}

/**
 * Full monthly bill calculation
 * Returns { members[], totalBazaar, totalMeals, totalGuestMeals,
 *           totalDeposits, totalDue, mealRate, guestMealRate }
 * Each member gets: meals, guestMeals, deposit, mealCost, guestCost, total, due, balance
 */
export function calculateMonthlyBill(members = [], meals = [], bazaar = [], deposits = [], extraCosts = []) {
  const totalBazaar   = bazaar.reduce((s, b) => s + Number(b.amount || 0), 0);
  const totalExtra    = extraCosts.reduce((s, e) => s + Number(e.amount || 0), 0);
  const grandExpense  = totalBazaar + totalExtra;

  // Aggregate per member
  const mealMap    = {}; // memberId -> meal units
  const guestMap   = {}; // memberId -> guest meal units
  const depositMap = {}; // memberId -> deposit amount

  members.forEach((m) => {
    mealMap[m.id]    = 0;
    guestMap[m.id]   = 0;
    depositMap[m.id] = 0;
  });

  meals.forEach((ml) => {
    const count = calculateMealCount(ml);
    if (mealMap[ml.memberId] !== undefined) mealMap[ml.memberId] += count;
    else mealMap[ml.memberId] = count;
  });

  // guestMeals array might be passed in future — accept via meals with type
  // For now guest meal tracking is separate
  deposits.forEach((d) => {
    if (depositMap[d.memberId] !== undefined) depositMap[d.memberId] += Number(d.amount || 0);
    else depositMap[d.memberId] = Number(d.amount || 0);
  });

  const totalMeals = Object.values(mealMap).reduce((s, v) => s + v, 0);
  const mealRate   = totalMeals > 0 ? grandExpense / totalMeals : 0;
  const totalDeposits = Object.values(depositMap).reduce((s, v) => s + v, 0);

  const memberBills = members.map((m) => {
    const mealCount   = mealMap[m.id]    || 0;
    const guestCount  = guestMap[m.id]   || 0;
    const deposit     = depositMap[m.id] || 0;
    const mealCost    = mealCount  * mealRate;
    const guestCost   = guestCount * mealRate;
    const total       = mealCost + guestCost;
    const due         = total - deposit;

    return {
      ...m,
      meals:     mealCount,
      guestMeals: guestCount,
      deposit,
      mealCost,
      guestCost,
      total,
      due,
      balance:   deposit - total,
      mealRate,
    };
  });

  const totalDue = memberBills.reduce((s, mb) => s + Math.max(0, mb.due), 0);

  return {
    memberBills,
    totalBazaar,
    totalExtra,
    grandExpense,
    totalMeals,
    totalDeposits,
    totalDue,
    mealRate,
    // legacy shape for old code
    totalGuestMeals: 0,
  };
}

export function formatCurrency(amount, symbol = "৳") {
  if (amount === undefined || amount === null) return `${symbol}0`;
  return `${symbol}${Number(amount).toLocaleString("en-BD", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function getMealRateColor(rate) {
  if (rate < 30) return "text-green-500";
  if (rate < 50) return "text-yellow-500";
  return "text-red-500";
}

// Group bazaar by category
export function groupBazaarByCategory(bazaar = []) {
  return bazaar.reduce((acc, item) => {
    const cat = item.category || "Other";
    acc[cat] = (acc[cat] || 0) + Number(item.amount || 0);
    return acc;
  }, {});
}

// Get last N days meal trend
export function getMealTrend(meals = [], days = 7) {
  const now = new Date();
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    const dayMeals = meals.filter((m) => m.date === key);
    const total = dayMeals.reduce((s, m) => s + calculateMealCount(m), 0);
    result.push({ date: key, label: d.toLocaleDateString("en-BD", { weekday: "short" }), meals: total });
  }
  return result;
}
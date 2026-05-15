import { formatCurrency } from "./billing";
import { getLocalDateKey } from "./permanentMeals";

function dateKeyOffset(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return getLocalDateKey(date);
}

function sumByDate(items, date, key = "amount") {
  return items
    .filter((item) => item.date === date)
    .reduce((total, item) => total + Number(item[key] || 0), 0);
}

function mealUnits(meal) {
  return (
    Number(meal.breakfast || 0) * 0.5 +
    Number(meal.lunch || 0) +
    Number(meal.dinner || 0)
  );
}

export function buildSmartInsights({
  members = [],
  meals = [],
  guestMeals = [],
  bazaar = [],
  deposits = [],
  billData = {},
  currency = "৳",
}) {
  const today = getLocalDateKey();
  const allMeals = [...meals, ...guestMeals];
  const todayMeals = allMeals
    .filter((meal) => meal.date === today)
    .reduce((total, meal) => total + mealUnits(meal), 0);
  const activeMembers = members.filter(
    (member) => member.status !== "inactive"
  );
  const memberBills = billData.memberBills || [];
  const topEater = [...memberBills].sort((a, b) => b.meals - a.meals)[0];
  const topContributor = [...memberBills].sort(
    (a, b) => b.deposits - a.deposits
  )[0];
  const highDueMembers = memberBills
    .filter((member) => Number(member.due || 0) > 0)
    .sort((a, b) => b.due - a.due);

  const last7 = Array.from({ length: 7 }, (_, index) => {
    const date = dateKeyOffset(index - 6);
    const bazaarTotal = sumByDate(bazaar, date);
    const depositTotal = sumByDate(deposits, date);
    const mealTotal = allMeals
      .filter((meal) => meal.date === date)
      .reduce((total, meal) => total + mealUnits(meal), 0);

    return {
      date,
      label: new Date(date).toLocaleDateString([], {
        weekday: "short",
      }),
      bazaar: bazaarTotal,
      deposits: depositTotal,
      meals: mealTotal,
    };
  });

  const previousSpend = last7
    .slice(0, 3)
    .reduce((total, item) => total + item.bazaar, 0);
  const recentSpend = last7
    .slice(4)
    .reduce((total, item) => total + item.bazaar, 0);
  const growth =
    previousSpend > 0
      ? ((recentSpend - previousSpend) / previousSpend) * 100
      : recentSpend > 0
        ? 100
        : 0;

  const dayOfMonth = Math.max(1, new Date().getDate());
  const estimatedMonthEnd =
    (Number(billData.totalBazaar || 0) / dayOfMonth) *
    new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();

  return {
    today,
    summary: {
      todayMeals,
      todayBazaar: sumByDate(bazaar, today),
      todayDeposits: sumByDate(deposits, today),
      activeMembers: activeMembers.length,
      pendingDue: Number(billData.totalDue || 0),
    },
    trends: last7,
    insights: [
      {
        label: "Highest meal consumer",
        value: topEater?.name || "No data",
        caption: topEater ? `${topEater.meals.toFixed(1)} meals` : "Add meals to rank members",
        tone: "accent",
      },
      {
        label: "Average daily meals",
        value:
          (last7.reduce((total, item) => total + item.meals, 0) / 7).toFixed(1),
        caption: "last 7 days",
        tone: "blue",
      },
      {
        label: "Estimated month-end cost",
        value: formatCurrency(estimatedMonthEnd || 0, currency),
        caption: "based on current pace",
        tone: "orange",
      },
      {
        label: "Expense growth",
        value: `${growth >= 0 ? "+" : ""}${growth.toFixed(0)}%`,
        caption: "recent vs previous days",
        tone: growth > 15 ? "red" : "green",
      },
      {
        label: "Deposit consistency",
        value: `${deposits.length}`,
        caption: "payments recorded",
        tone: "green",
      },
      {
        label: "Top contributor",
        value: topContributor?.name || "No data",
        caption: topContributor
          ? formatCurrency(topContributor.deposits, currency)
          : "No deposits yet",
        tone: "cyan",
      },
    ],
    achievements: [
      {
        title: "Top Eater",
        name: topEater?.name || "Waiting",
        value: topEater ? `${topEater.meals.toFixed(1)} meals` : "No meals yet",
      },
      {
        title: "Biggest Contributor",
        name: topContributor?.name || "Waiting",
        value: topContributor
          ? formatCurrency(topContributor.deposits, currency)
          : "No deposits yet",
      },
      {
        title: "Most Active Member",
        name: topEater?.name || "Waiting",
        value: `${allMeals.length} total entries`,
      },
      {
        title: "Meal Champion",
        name: topEater?.name || "Waiting",
        value: topEater ? "Leading this month" : "Start tracking meals",
      },
    ],
    due: {
      risk: highDueMembers[0] || null,
      highDueMembers,
      riskLevel:
        Number(billData.totalDue || 0) > Number(billData.totalDeposits || 0) * 0.35
          ? "high"
          : Number(billData.totalDue || 0) > 0
            ? "medium"
            : "clear",
    },
  };
}

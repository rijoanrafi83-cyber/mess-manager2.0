import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import {
  Users, UtensilsCrossed, ShoppingCart, Wallet,
  TrendingUp, TrendingDown, AlertCircle, Coffee,
  Star, Calendar, Activity
} from "lucide-react";
import { PageWrapper, PageHeader, StatCard, Card, CardHeader, Badge, SkeletonCard, EmptyState } from "../components/ui";
import { formatCurrency, getMealTrend, groupBazaarByCategory } from "../utils/billing";

const COLORS = ["#7c3aed", "#6366f1", "#3b82f6", "#0ea5e9", "#14b8a6", "#22c55e"];

const CustomTooltip = ({ active, payload, label, currency }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-xl p-3 shadow-xl text-xs">
      <p className="font-semibold text-gray-900 dark:text-white mb-2">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-500 dark:text-gray-400">{p.name}:</span>
          <span className="font-semibold text-gray-900 dark:text-white">
            {currency ? formatCurrency(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export function DashboardPage({ members = [], meals = [], bazaar = [], deposits = [], billData = {}, settings }) {
  const { memberBills = [], totalBazaar = 0, totalDeposits = 0, totalDue = 0, mealRate = 0, totalMeals = 0 } = billData;

  const mealTrend = useMemo(() => getMealTrend(meals, 7), [meals]);
  const bazaarByCategory = useMemo(() => groupBazaarByCategory(bazaar), [bazaar]);

  const pieData = useMemo(() =>
    Object.entries(bazaarByCategory).map(([name, value]) => ({ name, value })),
    [bazaarByCategory]
  );

  const topMealEater = useMemo(() =>
    [...memberBills].sort((a, b) => b.meals - a.meals)[0],
    [memberBills]
  );

  const topDueMember = useMemo(() =>
    [...memberBills].filter(m => m.due > 0).sort((a, b) => b.due - a.due)[0],
    [memberBills]
  );

  const recentBazaar = useMemo(() =>
    [...bazaar].sort((a, b) => {
      const ta = a.createdAt?.seconds || 0;
      const tb = b.createdAt?.seconds || 0;
      return tb - ta;
    }).slice(0, 5),
    [bazaar]
  );

  const recentDeposits = useMemo(() =>
    [...deposits].sort((a, b) => {
      const ta = a.createdAt?.seconds || 0;
      const tb = b.createdAt?.seconds || 0;
      return tb - ta;
    }).slice(0, 5),
    [deposits]
  );

  const currency = settings?.currency || "৳";

  const stats = [
    {
      label: "Total Members",
      value: members.length,
      icon: Users,
      iconBg: "bg-violet-500/10",
      iconColor: "text-violet-500",
      sub: `${members.filter(m => m.status === "active").length} active`,
    },
    {
      label: "Total Meals",
      value: totalMeals.toFixed(1),
      icon: UtensilsCrossed,
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-500",
      sub: `${meals.length} entries`,
    },
    {
      label: "Meal Rate",
      value: formatCurrency(mealRate.toFixed(2), currency),
      icon: TrendingUp,
      iconBg: "bg-green-500/10",
      iconColor: "text-green-500",
      sub: "per unit",
    },
    {
      label: "Total Bazaar",
      value: formatCurrency(totalBazaar, currency),
      icon: ShoppingCart,
      iconBg: "bg-orange-500/10",
      iconColor: "text-orange-500",
      sub: `${bazaar.length} transactions`,
    },
    {
      label: "Total Deposits",
      value: formatCurrency(totalDeposits, currency),
      icon: Wallet,
      iconBg: "bg-teal-500/10",
      iconColor: "text-teal-500",
      sub: `${deposits.length} payments`,
    },
    {
      label: "Total Due",
      value: formatCurrency(totalDue, currency),
      icon: AlertCircle,
      iconBg: totalDue > 0 ? "bg-red-500/10" : "bg-green-500/10",
      iconColor: totalDue > 0 ? "text-red-500" : "text-green-500",
      sub: totalDue > 0 ? "pending collection" : "all clear",
    },
  ];

  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.06 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  return (
    <PageWrapper>
      <PageHeader
        title={`${settings?.messName || "MessManager"} Dashboard`}
        subtitle={`Welcome back! Here's what's happening in your mess.`}
      />

      {/* Stats Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-8"
      >
        {stats.map((s) => (
          <motion.div key={s.label} variants={itemVariants}>
            <StatCard {...s} />
          </motion.div>
        ))}
      </motion.div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        {/* Meal trend */}
        <Card className="xl:col-span-2">
          <CardHeader title="Meal Trend" subtitle="Last 7 days" />
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={mealTrend}>
              <defs>
                <linearGradient id="mealGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="label" tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone" dataKey="meals" name="Meals"
                stroke="#7c3aed" strokeWidth={2}
                fill="url(#mealGrad)"
                dot={{ fill: "#7c3aed", r: 3 }}
                activeDot={{ r: 5, fill: "#7c3aed" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Bazaar by category */}
        <Card>
          <CardHeader title="Expense Breakdown" subtitle="By category" />
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={pieData} cx="50%" cy="50%"
                    innerRadius={45} outerRadius={70}
                    paddingAngle={3} dataKey="value"
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(v, currency)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {pieData.slice(0, 4).map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-gray-600 dark:text-gray-400 truncate max-w-[100px]">{item.name}</span>
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(item.value, currency)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyState icon={ShoppingCart} title="No expenses yet" description="Add bazaar entries to see breakdown" />
          )}
        </Card>
      </div>

      {/* Member comparison & activity */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        {/* Member meal comparison */}
        <Card className="xl:col-span-2">
          <CardHeader title="Member Meals Comparison" />
          {memberBills.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={memberBills.slice(0, 8)} barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="meals" name="Meals" fill="#7c3aed" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon={Activity} title="No meal data" description="Add members and meals to see comparison" />
          )}
        </Card>

        {/* Quick stats */}
        <div className="space-y-4">
          {/* Top meal eater */}
          <Card>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                <Star size={16} className="text-violet-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Top Meal Eater</p>
                {topMealEater ? (
                  <>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{topMealEater.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{topMealEater.meals.toFixed(1)} meals</p>
                  </>
                ) : (
                  <p className="text-xs text-gray-500">No data yet</p>
                )}
              </div>
            </div>
          </Card>

          {/* Top due member */}
          <Card>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <AlertCircle size={16} className="text-red-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Highest Due</p>
                {topDueMember ? (
                  <>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{topDueMember.name}</p>
                    <p className="text-xs text-red-500">{formatCurrency(topDueMember.due, currency)} due</p>
                  </>
                ) : (
                  <p className="text-xs text-green-500">Everyone's clear! 🎉</p>
                )}
              </div>
            </div>
          </Card>

          {/* Current month summary */}
          <Card>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <Calendar size={16} className="text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">This Month</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {new Date().toLocaleString("default", { month: "long", year: "numeric" })}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {totalMeals.toFixed(0)} meals · {bazaar.length} purchases
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent bazaar */}
        <Card noPad>
          <div className="p-6 pb-0">
            <CardHeader title="Recent Expenses" subtitle="Latest purchases" />
          </div>
          {recentBazaar.length > 0 ? (
            <div className="divide-y divide-gray-100 dark:divide-white/5">
              {recentBazaar.map((item) => (
                <div key={item.id} className="flex items-center gap-3 px-6 py-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                    <ShoppingCart size={14} className="text-orange-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.title || "Expense"}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.date} · {item.category || "Other"}</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(item.amount, currency)}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 pb-6">
              <EmptyState icon={ShoppingCart} title="No expenses yet" />
            </div>
          )}
        </Card>

        {/* Recent deposits */}
        <Card noPad>
          <div className="p-6 pb-0">
            <CardHeader title="Recent Deposits" subtitle="Latest payments" />
          </div>
          {recentDeposits.length > 0 ? (
            <div className="divide-y divide-gray-100 dark:divide-white/5">
              {recentDeposits.map((item) => {
                const member = members.find(m => m.id === item.memberId);
                return (
                  <div key={item.id} className="flex items-center gap-3 px-6 py-3">
                    <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                      <Wallet size={14} className="text-green-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{member?.name || "Unknown"}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.date} · {item.paymentMethod || "Cash"}</p>
                    </div>
                    <p className="text-sm font-semibold text-green-500">+{formatCurrency(item.amount, currency)}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-6 pb-6">
              <EmptyState icon={Wallet} title="No deposits yet" />
            </div>
          )}
        </Card>
      </div>
    </PageWrapper>
  );
}
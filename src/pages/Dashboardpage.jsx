import { useMemo } from "react";

import { motion } from "framer-motion";
import { Link } from "react-router-dom";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import {
  Users,
  UtensilsCrossed,
  ShoppingCart,
  Wallet,
  AlertCircle,
  Star,
  Calendar,
  Activity,
  Plus,
  FileText,
  Cloud,
  Trophy,
  Zap,
} from "lucide-react";

import {
  PageWrapper,
  Card,
  CardHeader,
  Button,
  EmptyState,
} from "../components/ui";
import {
  ActivityTimeline,
  MetricCard,
  MiniBarList,
  SmartHero,
  SmartSection,
} from "../components/SmartUI";

import {
  formatCurrency,
  getMealTrend,
  groupBazaarByCategory,
} from "../utils/billing";

import { useChartTheme } from "../hooks/useChartTheme";
import { buildSmartInsights } from "../utils/smartInsights";


/* =========================================================
   CUSTOM TOOLTIP
========================================================= */

const CustomTooltip = ({
  active,
  payload,
  label,
  currency,
}) => {

  if (
    !active ||
    !payload?.length
  ) {
    return null;
  }

  return (

    <div className="theme-card border rounded-xl p-3 shadow-xl text-xs">

      <p className="font-semibold theme-text mb-2">
        {label}
      </p>

      {payload.map((p, i) => (

        <div
          key={i}
          className="flex items-center gap-2"
        >

          <div
            className="w-2 h-2 rounded-full"
            style={{
              background:
                p.color,
            }}
          />

          <span className="theme-muted-text">
            {p.name}:
          </span>

          <span className="font-semibold theme-text">

            {currency
              ? formatCurrency(
                  p.value,
                  currency
                )
              : p.value}

          </span>

        </div>
      ))}

    </div>
  );
};



/* =========================================================
   MAIN PAGE
========================================================= */

export function DashboardPage({

  members = [],

  meals = [],

  guestMeals = [],

  bazaar = [],

  deposits = [],

  billData = {},

  settings,

  online = true,
}) {

  const {

    memberBills = [],

    totalBazaar = 0,

    totalDeposits = 0,

    totalDue = 0,

    mealRate = 0,

    totalMeals = 0,

  } = billData;

  const chartTheme = useChartTheme();



  /* =====================================================
     TREND
  ===================================================== */

  const combinedMeals =
    useMemo(
      () => [

        ...meals,

        ...guestMeals

      ],
      [meals, guestMeals]
    );



  const mealTrend =
    useMemo(

      () =>
        getMealTrend(
          combinedMeals,
          7
        ),

      [combinedMeals]
    );



  /* =====================================================
     BAZAAR PIE
  ===================================================== */

  const bazaarByCategory =
    useMemo(

      () =>
        groupBazaarByCategory(
          bazaar
        ),

      [bazaar]
    );



  const pieData =
    useMemo(
      () =>

        Object.entries(
          bazaarByCategory
        ).map(
          ([name, value]) => ({
            name,
            value,
          })
        ),

      [bazaarByCategory]
    );



  /* =====================================================
     TOP MEMBER
  ===================================================== */

  const topMealEater =
    useMemo(

      () =>

        [...memberBills].sort(
          (a, b) =>
            b.meals -
            a.meals
        )[0],

      [memberBills]
    );



  const topDueMember =
    useMemo(

      () =>

        [...memberBills]

          .filter(
            (m) => m.due > 0
          )

          .sort(
            (a, b) =>
              b.due - a.due
          )[0],

      [memberBills]
    );



  /* =====================================================
     RECENT BAZAAR
  ===================================================== */

  const recentBazaar =
    useMemo(

      () =>

        [...bazaar]

          .sort((a, b) => {

            const ta =
              a.createdAt
                ?.seconds || 0;

            const tb =
              b.createdAt
                ?.seconds || 0;

            return tb - ta;
          })

          .slice(0, 5),

      [bazaar]
    );



  /* =====================================================
     RECENT DEPOSITS
  ===================================================== */

  const recentDeposits =
    useMemo(

      () =>

        [...deposits]

          .sort((a, b) => {

            const ta =
              a.createdAt
                ?.seconds || 0;

            const tb =
              b.createdAt
                ?.seconds || 0;

            return tb - ta;
          })

          .slice(0, 5),

      [deposits]
    );

  const activityItems =
    useMemo(() => {
      const expenseItems = recentBazaar.map((item) => ({
        id: `bazaar-${item.id}`,
        title: item.title || "Bazaar expense",
        meta: `${item.date || "No date"} · ${item.category || "Other"}`,
        value: formatCurrency(item.amount, settings?.currency || "৳"),
        icon: <ShoppingCart size={14} />,
        tone: "bg-orange-500/10 text-orange-500",
      }));

      const depositItems = recentDeposits.map((item) => {
        const member = members.find((m) => m.id === item.memberId);
        return {
          id: `deposit-${item.id}`,
          title: member?.name || "Member deposit",
          meta: `${item.date || "No date"} · ${item.paymentMethod || "Cash"}`,
          value: `+${formatCurrency(item.amount, settings?.currency || "৳")}`,
          icon: <Wallet size={14} />,
          tone: "bg-emerald-500/10 text-emerald-500",
        };
      });

      return [...expenseItems, ...depositItems].slice(0, 8);
    }, [members, recentBazaar, recentDeposits, settings?.currency]);



  const currency =
    settings?.currency ||
    "৳";

  const smartInsights =
    useMemo(
      () =>
        buildSmartInsights({
          members,
          meals,
          guestMeals,
          bazaar,
          deposits,
          billData,
          currency,
        }),
      [
        bazaar,
        billData,
        currency,
        deposits,
        guestMeals,
        meals,
        members,
      ]
    );






  return (

    <PageWrapper>

      <SmartHero
        eyebrow="Realtime Operations"
        title={settings?.messName || "MessManager Dashboard"}
        subtitle="A live operating view for meals, expenses, deposits, member balances, and collection risk."
        metrics={[
          { label: "Meal Rate", value: formatCurrency(mealRate, currency), caption: "current blended rate" },
          { label: "Net Due", value: formatCurrency(totalDue, currency), caption: totalDue > 0 ? "pending collection" : "all settled" },
          { label: "Members", value: members.length, caption: `${members.filter((m) => m.status === "active").length} active` },
          { label: "Meals", value: totalMeals.toFixed(1), caption: `${combinedMeals.length} tracked entries` },
        ]}
        actions={
          <>
            <Link to="/meals">
              <Button variant="secondary">
                <Plus size={16} />
                Add Meals
              </Button>
            </Link>
            <Link to="/reports">
              <Button>
                <FileText size={16} />
                View Reports
              </Button>
            </Link>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-3 gap-2 sm:gap-3 md:grid-cols-3 xl:grid-cols-6">
        {[
          {
            label: "Today Meals",
            value: smartInsights.summary.todayMeals.toFixed(1),
            icon: UtensilsCrossed,
            tone: "accent",
          },
          {
            label: "Today Bazaar",
            value: formatCurrency(smartInsights.summary.todayBazaar, currency),
            icon: ShoppingCart,
            tone: "orange",
          },
          {
            label: "Today Deposits",
            value: formatCurrency(smartInsights.summary.todayDeposits, currency),
            icon: Wallet,
            tone: "green",
          },
          {
            label: "Active Members",
            value: smartInsights.summary.activeMembers,
            icon: Users,
            tone: "blue",
          },
          {
            label: "Pending Due",
            value: formatCurrency(smartInsights.summary.pendingDue, currency),
            icon: AlertCircle,
            tone: smartInsights.summary.pendingDue > 0 ? "red" : "green",
          },
          {
            label: "Sync Status",
            value: online ? "Live" : "Offline",
            icon: Cloud,
            tone: online ? "green" : "orange",
          },
        ].map((widget) => (
          <MetricCard
            key={widget.label}
            label={widget.label}
            value={widget.value}
            caption="daily summary"
            icon={widget.icon}
            tone={widget.tone}
          />
        ))}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <SmartSection
          className="xl:col-span-2"
          title="Smart Analytics"
          subtitle="Operational insights from meals, deposits, due, and weekly spend"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {smartInsights.insights.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border theme-muted p-4"
              >
                <p className="text-[11px] font-bold uppercase tracking-wider theme-muted-text">
                  {item.label}
                </p>
                <p className="mt-2 truncate text-xl font-black theme-text">
                  {item.value}
                </p>
                <p className="mt-1 text-xs theme-muted-text">
                  {item.caption}
                </p>
              </div>
            ))}
          </div>
        </SmartSection>

        <SmartSection title="Due Risk" subtitle="Smart collection alerts">
          <div
            className={`rounded-2xl border p-4 ${
              smartInsights.due.riskLevel === "high"
                ? "bg-red-500/10 text-red-300"
                : smartInsights.due.riskLevel === "medium"
                  ? "bg-amber-500/10 text-amber-300"
                  : "bg-emerald-500/10 text-emerald-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <Zap size={18} />
              <p className="text-sm font-bold">
                {smartInsights.due.riskLevel === "clear"
                  ? "No due risk"
                  : `${smartInsights.due.risk?.name || "Member"} needs attention`}
              </p>
            </div>
            <p className="mt-2 text-xs leading-5 opacity-85">
              {smartInsights.due.risk
                ? `${formatCurrency(smartInsights.due.risk.due, currency)} pending. Keep alerts visible but non-intrusive.`
                : "All tracked member balances are settled."}
            </p>
          </div>
        </SmartSection>
      </div>

      <SmartSection
        className="mb-6"
        title="Monthly Achievements"
        subtitle="Recognition cards for the current month"
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {smartInsights.achievements.map((card) => (
            <motion.div
              key={card.title}
              whileHover={{ y: -2 }}
              className="rounded-2xl border theme-muted p-4"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
                <Trophy size={18} />
              </div>
              <p className="text-xs font-bold uppercase tracking-wider theme-muted-text">
                {card.title}
              </p>
              <p className="mt-2 truncate text-lg font-black theme-text">
                {card.name}
              </p>
              <p className="mt-1 text-xs theme-muted-text">{card.value}</p>
            </motion.div>
          ))}
        </div>
      </SmartSection>





      {/* =====================================================
         CHARTS
      ===================================================== */}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">

        {/* =========================================
           MEAL TREND
        ========================================= */}

        <SmartSection
          className="xl:col-span-2"
          title="Monthly Meal Momentum"
          subtitle="Realtime meal units for the last seven days"
        >

          <ResponsiveContainer
            width="100%"
            height={160}
          >

            <AreaChart
              data={mealTrend}
            >

              <defs>

                <linearGradient
                  id="mealGrad"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >

                  <stop
                    offset="5%"
                    stopColor={chartTheme.accent}
                    stopOpacity={
                      0.3
                    }
                  />

                  <stop
                    offset="95%"
                    stopColor={chartTheme.accent}
                    stopOpacity={0}
                  />

                </linearGradient>

              </defs>



              <CartesianGrid
                strokeDasharray="3 3"
                stroke={chartTheme.grid}
              />

              <XAxis
                dataKey="label"
                tick={{
                  fill: chartTheme.axis,
                  fontSize: 11,
                }}
                axisLine={false}
                tickLine={false}
              />

              <YAxis
                tick={{
                  fill: chartTheme.axis,
                  fontSize: 11,
                }}
                axisLine={false}
                tickLine={false}
              />

              <Tooltip
                content={
                  <CustomTooltip />
                }
              />

              <Area
                type="monotone"

                dataKey="meals"

                name="Meals"

                stroke={chartTheme.accent}

                strokeWidth={2}

                fill="url(#mealGrad)"

                dot={{
                  fill:
                    chartTheme.accent,
                  r: 3,
                }}

                activeDot={{
                  r: 5,
                  fill:
                    chartTheme.accent,
                }}
              />

            </AreaChart>

          </ResponsiveContainer>

        </SmartSection>



        {/* =========================================
           PIE CHART
        ========================================= */}

        <SmartSection title="Expense Mix" subtitle="Bazaar spend by category">

          {pieData.length >
          0 ? (

            <>

              <ResponsiveContainer
                width="100%"
                height={160}
              >

                <PieChart>

                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >

                    {pieData.map(
                      (_, i) => (

                        <Cell
                          key={i}
                          fill={
                            chartTheme.colors[
                              i %
                                chartTheme.colors.length
                            ]
                          }
                        />
                      )
                    )}

                  </Pie>

                  <Tooltip
                    content={
                      <CustomTooltip
                        currency={
                          settings?.currency
                        }
                      />
                    }
                  />

                </PieChart>

              </ResponsiveContainer>

            </>

          ) : (

            <EmptyState
              icon={
                ShoppingCart
              }
              title="No expenses yet"
              description="Add bazaar entries to see breakdown"
            />
          )}

        </SmartSection>

      </div>



      {/* =====================================================
         MEMBER COMPARISON
      ===================================================== */}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">

        <SmartSection className="xl:col-span-2" title="Member Meal Leaders" subtitle="Highest meal consumers this month">

          {memberBills.length >
          0 ? (

            <ResponsiveContainer
              width="100%"
              height={160}
            >

              <BarChart
                data={memberBills.slice(
                  0,
                  8
                )}
                barSize={16}
              >

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={chartTheme.grid}
                />

                <XAxis
                  dataKey="name"
                  tick={{
                    fill: chartTheme.axis,
                    fontSize: 10,
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  tick={{
                    fill: chartTheme.axis,
                    fontSize: 11,
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip
                  content={
                    <CustomTooltip />
                  }
                />

                <Bar
                  dataKey="meals"
                  name="Meals"
                  fill={chartTheme.accent}
                  radius={[
                    6,
                    6,
                    0,
                    0,
                  ]}
                />

              </BarChart>

            </ResponsiveContainer>

          ) : (

            <EmptyState
              icon={Activity}
              title="No meal data"
              description="Add members and meals to see comparison"
            />
          )}

        </SmartSection>



        {/* =========================================
           SIDE CARDS
        ========================================= */}

        <div className="space-y-4">

          {/* TOP EATER */}

          <Card>

            <div className="flex items-start gap-3">

              <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">

                <Star
                  size={16}
                  className="text-violet-500"
                />

              </div>



              <div className="min-w-0">

                <p className="text-xs theme-muted-text font-medium mb-1">
                  Top Meal Eater
                </p>

                {topMealEater ? (

                  <>

                    <p className="font-semibold theme-text text-sm truncate">
                      {
                        topMealEater.name
                      }
                    </p>

                    <p className="text-xs theme-muted-text">
                      {topMealEater.meals.toFixed(
                        1
                      )}{" "}
                      meals
                    </p>

                  </>

                ) : (

                  <p className="text-xs text-gray-500">
                    No data yet
                  </p>
                )}

              </div>

            </div>

          </Card>



          {/* TOP DUE */}

          <Card>

            <div className="flex items-start gap-3">

              <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">

                <AlertCircle
                  size={16}
                  className="text-red-500"
                />

              </div>



              <div className="min-w-0">

                <p className="text-xs theme-muted-text font-medium mb-1">
                  Highest Due
                </p>

                {topDueMember ? (

                  <>

                    <p className="font-semibold theme-text text-sm truncate">

                      {
                        topDueMember.name
                      }

                    </p>

                    <p className="text-xs text-red-500">

                      {formatCurrency(
                        topDueMember.due,
                        currency
                      )}{" "}
                      due

                    </p>

                  </>

                ) : (

                  <p className="text-xs text-green-500">
                    Everyone's clear!
                    🎉
                  </p>
                )}

              </div>

            </div>

          </Card>



          {/* MONTH */}

          <Card>

            <div className="flex items-start gap-3">

              <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">

                <Calendar
                  size={16}
                  className="text-blue-500"
                />

              </div>



              <div>

                <p className="text-xs theme-muted-text font-medium mb-1">
                  This Month
                </p>

                <p className="text-sm font-semibold theme-text">

                  {new Date().toLocaleString(
                    "default",
                    {
                      month:
                        "long",
                      year:
                        "numeric",
                    }
                  )}

                </p>

                <p className="text-xs theme-muted-text">

                  {totalMeals.toFixed(
                    0
                  )}{" "}
                  meals ·{" "}
                  {bazaar.length}{" "}
                  purchases

                </p>

              </div>

            </div>

          </Card>

        </div>

      </div>



      {/* =====================================================
         RECENT ACTIVITY
      ===================================================== */}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <SmartSection title="Live Activity Feed" subtitle="Latest deposits and bazaar activity">
          <ActivityTimeline items={activityItems} empty="No deposits or expenses have been recorded yet." />
        </SmartSection>

        <SmartSection title="Balance Watchlist" subtitle="Members requiring follow-up">
          <MiniBarList
            items={[...memberBills]
              .filter((m) => m.due > 0)
              .sort((a, b) => b.due - a.due)
              .slice(0, 6)
              .map((m) => ({ ...m, label: m.name, value: m.due }))}
            format={(value) => formatCurrency(value, currency)}
          />
        </SmartSection>

        {/* =========================================
           RECENT BAZAAR
        ========================================= */}

        <Card noPad className="xl:col-span-1">

          <div className="p-6 pb-0">

            <CardHeader
              title="Recent Expenses"
              subtitle="Latest purchases"
            />

          </div>



          {recentBazaar.length >
          0 ? (

            <div className="divide-y divide-gray-100 dark:divide-white/5">

              {recentBazaar.map(
                (item) => (

                  <div
                    key={item.id}
                    className="flex items-center gap-3 px-6 py-3"
                  >

                    <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">

                      <ShoppingCart
                        size={14}
                        className="text-orange-500"
                      />

                    </div>



                    <div className="flex-1 min-w-0">

                      <p className="text-sm font-medium theme-text truncate">

                        {item.title ||
                          "Expense"}

                      </p>

                      <p className="text-xs theme-muted-text">

                        {item.date} ·{" "}
                        {item.category ||
                          "Other"}

                      </p>

                    </div>



                    <p className="text-sm font-semibold theme-text">

                      {formatCurrency(
                        item.amount,
                        currency
                      )}

                    </p>

                  </div>
                )
              )}

            </div>

          ) : (

            <div className="px-6 pb-6">

              <EmptyState
                icon={
                  ShoppingCart
                }
                title="No expenses yet"
              />

            </div>
          )}

        </Card>



        {/* =========================================
           RECENT DEPOSITS
        ========================================= */}

        <Card noPad>

          <div className="p-6 pb-0">

            <CardHeader
              title="Recent Deposits"
              subtitle="Latest payments"
            />

          </div>



          {recentDeposits.length >
          0 ? (

            <div className="divide-y divide-gray-100 dark:divide-white/5">

              {recentDeposits.map(
                (item) => {

                  const member =
                    members.find(
                      (m) =>
                        m.id ===
                        item.memberId
                    );

                  return (

                    <div
                      key={item.id}
                      className="flex items-center gap-3 px-6 py-3"
                    >

                      <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">

                        <Wallet
                          size={14}
                          className="text-green-500"
                        />

                      </div>



                      <div className="flex-1 min-w-0">

                        <p className="text-sm font-medium theme-text truncate">

                          {member?.name ||
                            "Unknown"}

                        </p>

                        <p className="text-xs theme-muted-text">

                          {item.date} ·{" "}
                          {item.paymentMethod ||
                            "Cash"}

                        </p>

                      </div>



                      <p className="text-sm font-semibold text-green-500">

                        +
                        {formatCurrency(
                          item.amount,
                          currency
                        )}

                      </p>

                    </div>
                  );
                }
              )}

            </div>

          ) : (

            <div className="px-6 pb-6">

              <EmptyState
                icon={Wallet}
                title="No deposits yet"
              />

            </div>
          )}

        </Card>

      </div>

    </PageWrapper>
  );
}

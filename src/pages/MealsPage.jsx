import {
  useState,
  useMemo,
  useCallback,
  useEffect
} from "react";

import { motion, AnimatePresence } from "framer-motion";

import toast from "react-hot-toast";

import {
  UtensilsCrossed,
  Plus,
  Coffee,
  Sun,
  Moon,
  Users,
  Trash2,
  Edit2,
  CalendarDays,
  Activity
} from "lucide-react";

import {
  PageWrapper,
  Card,
  Button,
  Input,
  Select,
  Modal,
  Badge,
  EmptyState,
  SearchInput,
  NumberInput,
  Table
} from "../components/ui";
import {
  FilterSurface,
  MetricCard,
  MiniBarList,
  PersonAvatar,
  PremiumHero,
  PremiumSection,
} from "../components/PremiumUI";

import {
  addMeal,
  updateMeal,
  deleteMeal,
  addGuestMeal,
  deleteGuestMeal,
  saveMealSettings,
  subscribeMealSettings
} from "../services/firestoreService";

import { calculateMealCount } from "../utils/billing";



/* =========================================================
   MEAL ENTRY FORM
========================================================= */

function MealEntryForm({
  members,
  ownerId,
  initial,
  onClose
}) {

  const today =
    new Date()
      .toISOString()
      .split("T")[0];

  const [form, setForm] =
    useState(
      initial || {
        memberId:
          members[0]?.id || "",
        date: today,
        breakfast: 0,
        lunch: 0,
        dinner: 0,
      }
    );

  const [loading, setLoading] =
    useState(false);

  const set = (k, v) =>
    setForm((f) => ({
      ...f,
      [k]: v,
    }));

  const totalUnits =
    form.breakfast * 0.5 +
    Number(form.lunch) +
    Number(form.dinner);

  const handleSubmit =
    async (e) => {

      e.preventDefault();

      if (
        !form.memberId ||
        !form.date
      ) {
        return toast.error(
          "Please fill all required fields"
        );
      }

      setLoading(true);

      try {

        if (initial?.id) {

          await updateMeal(
            initial.id,
            form
          );

        } else {

          await addMeal(
            ownerId,
            {
              ...form,
              type: "regular"
            }
          );
        }

        toast.success(
          initial
            ? "Meal updated!"
            : "Meal added!"
        );

        onClose();

      } catch (err) {

        console.error(err);

        toast.error(
          "Failed to save meal"
        );

      } finally {

        setLoading(false);
      }
    };



  return (

    <form
      onSubmit={handleSubmit}
      className="space-y-5"
    >

      <div className="grid grid-cols-2 gap-4">

        <Select
          label="Member"
          value={form.memberId}
          onChange={(e) =>
            set(
              "memberId",
              e.target.value
            )
          }
          required
        >

          <option value="">
            Select member...
          </option>

          {members.map((m) => (
            <option
              key={m.id}
              value={m.id}
            >
              {m.name}
            </option>
          ))}

        </Select>

        <Input
          label="Date"
          type="date"
          value={form.date}
          onChange={(e) =>
            set(
              "date",
              e.target.value
            )
          }
          required
        />

      </div>



      <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">

        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-4">
          Meal Count
        </p>

        <div className="grid grid-cols-3 gap-4">

          <NumberInput
            label="Breakfast (×0.5)"
            value={form.breakfast}
            onChange={(v) =>
              set("breakfast", v)
            }
          />

          <NumberInput
            label="Lunch (×1)"
            value={form.lunch}
            onChange={(v) =>
              set("lunch", v)
            }
          />

          <NumberInput
            label="Dinner (×1)"
            value={form.dinner}
            onChange={(v) =>
              set("dinner", v)
            }
          />

        </div>



        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-white/10 text-center">

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Total Units
          </p>

          <p className="text-2xl font-bold text-violet-600">
            {totalUnits.toFixed(1)}
          </p>

        </div>

      </div>



      <div className="flex gap-3">

        <Button
          type="submit"
          loading={loading}
          className="flex-1"
        >
          {initial
            ? "Update Meal"
            : "Add Meal"}
        </Button>

        <Button
          type="button"
          variant="secondary"
          onClick={onClose}
        >
          Cancel
        </Button>

      </div>

    </form>
  );
}



/* =========================================================
   GUEST MEAL FORM
========================================================= */

function GuestMealForm({
  members,
  ownerId,
  onClose
}) {

  const today =
    new Date()
      .toISOString()
      .split("T")[0];

  const [form, setForm] =
    useState({
      memberId:
        members[0]?.id || "",
      guestName: "",
      date: today,
      breakfast: 0,
      lunch: 0,
      dinner: 0,
      note: "",
    });

  const [loading, setLoading] =
    useState(false);

  const set = (k, v) =>
    setForm((f) => ({
      ...f,
      [k]: v,
    }));

  const totalUnits =
    form.breakfast * 0.5 +
    Number(form.lunch) +
    Number(form.dinner);

  const handleSubmit =
    async (e) => {

      e.preventDefault();

      if (
        !form.memberId ||
        !form.guestName
      ) {
        return toast.error(
          "Please fill required fields"
        );
      }

      setLoading(true);

      try {

        await addGuestMeal(
          ownerId,
          {
            ...form,
            type: "guest"
          }
        );

        toast.success(
          "Guest meal added!"
        );

        onClose();

      } catch (err) {

        console.error(err);

        toast.error(
          "Failed to save guest meal"
        );

      } finally {

        setLoading(false);
      }
    };



  return (

    <form
      onSubmit={handleSubmit}
      className="space-y-4"
    >

      <div className="grid grid-cols-2 gap-4">

        <Select
          label="Host Member"
          value={form.memberId}
          onChange={(e) =>
            set(
              "memberId",
              e.target.value
            )
          }
          required
        >

          <option value="">
            Select member...
          </option>

          {members.map((m) => (
            <option
              key={m.id}
              value={m.id}
            >
              {m.name}
            </option>
          ))}

        </Select>



        <Input
          label="Guest Name"
          value={form.guestName}
          onChange={(e) =>
            set(
              "guestName",
              e.target.value
            )
          }
          required
        />



        <Input
          label="Date"
          type="date"
          value={form.date}
          onChange={(e) =>
            set(
              "date",
              e.target.value
            )
          }
          required
        />



        <Input
          label="Note"
          value={form.note}
          onChange={(e) =>
            set(
              "note",
              e.target.value
            )
          }
          placeholder="Optional"
        />

      </div>



      <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">

        <div className="grid grid-cols-3 gap-4">

          <NumberInput
            label="Breakfast"
            value={form.breakfast}
            onChange={(v) =>
              set("breakfast", v)
            }
          />

          <NumberInput
            label="Lunch"
            value={form.lunch}
            onChange={(v) =>
              set("lunch", v)
            }
          />

          <NumberInput
            label="Dinner"
            value={form.dinner}
            onChange={(v) =>
              set("dinner", v)
            }
          />

        </div>



        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-white/10 text-center">

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Total Units
          </p>

          <p className="text-2xl font-bold text-orange-500">
            {totalUnits.toFixed(1)}
          </p>

        </div>

      </div>



      <div className="flex gap-3">

        <Button
          type="submit"
          loading={loading}
          className="flex-1"
        >
          Add Guest Meal
        </Button>

        <Button
          type="button"
          variant="secondary"
          onClick={onClose}
        >
          Cancel
        </Button>

      </div>

    </form>
  );
}



/* =========================================================
   MAIN PAGE
========================================================= */

export function MealsPage({
  members = [],
  meals = [],
  guestMeals = [],
  ownerId,
  userProfile
}) {

  const [
    showAddMeal,
    setShowAddMeal
  ] = useState(false);

  const [
    showGuestMeal,
    setShowGuestMeal
  ] = useState(false);

  const [editMeal, setEditMeal] =
    useState(null);

  const [search, setSearch] =
    useState("");

  const [
    filterMember,
    setFilterMember
  ] = useState("all");

  const [
    filterDate,
    setFilterDate
  ] = useState("");

  const [delId, setDelId] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const [
    mealSettings,
    setMealSettings
  ] = useState([]);

  const isAdmin =
    userProfile?.role === "admin";



  useEffect(() => {

    if (!ownerId) return;

    const unsub =
      subscribeMealSettings(
        ownerId,
        setMealSettings
      );

    return () => unsub();

  }, [ownerId]);



  const getMealSetting =
    (memberId) => {

      return (
        mealSettings.find(
          (m) =>
            m.memberId === memberId
        ) || {
          breakfast: false,
          lunch: false,
          dinner: false,
        }
      );
    };



  const combinedMeals =
    useMemo(() => {

      return [

        ...meals.map((m) => ({
          ...m,
          type: "regular"
        })),

        ...guestMeals.map((g) => ({
          ...g,
          type: "guest"
        }))

      ];

    }, [meals, guestMeals]);



  const filtered =
    useMemo(() => {

      let list = combinedMeals;

      if (
        filterMember !== "all"
      ) {
        list = list.filter(
          (m) =>
            m.memberId ===
            filterMember
        );
      }

      if (filterDate) {
        list = list.filter(
          (m) =>
            m.date === filterDate
        );
      }

      if (search) {

        const q =
          search.toLowerCase();

        list = list.filter((m) => {

          const member =
            members.find(
              (mb) =>
                mb.id ===
                m.memberId
            );

          return (
            member?.name
              ?.toLowerCase()
              .includes(q) ||

            m.guestName
              ?.toLowerCase()
              .includes(q) ||

            m.date?.includes(q)
          );
        });
      }

      return [...list].sort(
        (a, b) =>
          (b.date || "")
            .localeCompare(
              a.date || ""
            )
      );

    }, [
      combinedMeals,
      filterMember,
      filterDate,
      search,
      members
    ]);



  const totalUnits =
    useMemo(() => {

      return filtered.reduce(
        (sum, meal) =>
          sum +
          calculateMealCount(
            meal
          ),
        0
      );

    }, [filtered]);

  const guestUnits =
    useMemo(
      () =>
        guestMeals.reduce(
          (sum, meal) =>
            sum +
            calculateMealCount(
              meal
            ),
          0
        ),
      [guestMeals]
    );

  const activeMealSettings =
    useMemo(
      () =>
        mealSettings.filter(
          (setting) =>
            setting.breakfast ||
            setting.lunch ||
            setting.dinner
        ).length,
      [mealSettings]
    );

  const memberMealSummary =
    useMemo(
      () =>
        members
          .map((member) => ({
            id: member.id,
            label: member.name,
            value: combinedMeals
              .filter((meal) => meal.memberId === member.id)
              .reduce(
                (sum, meal) =>
                  sum +
                  calculateMealCount(
                    meal
                  ),
                0
              ),
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 8),
      [members, combinedMeals]
    );



  const handleDelete =
    useCallback(async () => {

      if (!delId) return;

      setLoading(true);

      try {

        const meal =
          filtered.find(
            (m) =>
              m.id === delId
          );

        if (
          meal?.type === "guest"
        ) {

          await deleteGuestMeal(
            delId
          );

        } else {

          await deleteMeal(delId);
        }

        toast.success(
          "Meal deleted"
        );

        setDelId(null);

      } catch (err) {

        console.error(err);

        toast.error(
          "Failed to delete meal"
        );

      } finally {

        setLoading(false);
      }

    }, [delId, filtered]);



  const memberName = (id) =>
    members.find(
      (m) => m.id === id
    )?.name || "Unknown";



  const columns = [
    {
      key: "memberId",
      label: "Member",

      render: (v, row) => {

        const isGuest =
          row.type === "guest";

        return (

          <div className="flex items-center gap-2">

            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                isGuest
                  ? "bg-orange-500/10 text-orange-500"
                  : "bg-violet-500/10 text-violet-500"
              }`}
            >

              {isGuest
                ? row.guestName?.charAt(0)
                : memberName(v).charAt(0)}

            </div>



            <div className="flex flex-col">

              <span className="font-medium text-sm text-gray-900 dark:text-white">

                {isGuest
                  ? `${row.guestName} (Guest)`
                  : memberName(v)}

              </span>

              {isGuest && (
                <span className="text-xs text-gray-400">
                  Host: {memberName(v)}
                </span>
              )}

            </div>

          </div>
        );
      }
    },



    {
      key: "date",
      label: "Date",

      render: (v) => (
        <span className="text-sm">
          {v}
        </span>
      )
    },



    {
      key: "breakfast",
      label: "Breakfast",

      render: (v) => (
        <div className="flex items-center gap-1">
          <Coffee
            size={12}
            className="text-orange-400"
          />

          <span className="text-sm">
            {v || 0}

            <span className="text-xs text-gray-400">
              {" "}
              ×0.5
            </span>

          </span>
        </div>
      )
    },



    {
      key: "lunch",
      label: "Lunch",

      render: (v) => (
        <div className="flex items-center gap-1">
          <Sun
            size={12}
            className="text-yellow-400"
          />

          <span className="text-sm">
            {v || 0}
          </span>
        </div>
      )
    },



    {
      key: "dinner",
      label: "Dinner",

      render: (v) => (
        <div className="flex items-center gap-1">
          <Moon
            size={12}
            className="text-blue-400"
          />

          <span className="text-sm">
            {v || 0}
          </span>
        </div>
      )
    },



    {
      key: "totalMeals",
      label: "Total",

      render: (_, row) => (

        <Badge
          variant={
            row.type === "guest"
              ? "warning"
              : "purple"
          }
        >
          {calculateMealCount(
            row
          ).toFixed(1)}{" "}
          units
        </Badge>
      )
    },



    ...(isAdmin
      ? [
          {
            key: "id",
            label: "",

            render: (
              id,
              row
            ) => (

              <div className="flex gap-1">

                {row.type !==
                  "guest" && (

                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={(e) => {

                      e.stopPropagation();

                      setEditMeal(
                        row
                      );
                    }}
                  >
                    <Edit2 size={12} />
                  </Button>
                )}

                <Button
                  variant="danger"
                  size="xs"
                  onClick={(e) => {

                    e.stopPropagation();

                    setDelId(id);
                  }}
                >
                  <Trash2 size={12} />
                </Button>

              </div>
            )
          }
        ]
      : [])
  ];



  return (

    <PageWrapper>

      <PremiumHero
        eyebrow="Meal Operations"
        title="Meals"
        subtitle="Track daily meals, guest meals, recurring preferences, and member-level consumption from one responsive command view."
        metrics={[
          { label: "Entries", value: filtered.length, caption: "current filter" },
          { label: "Meal Units", value: totalUnits.toFixed(1), caption: "filtered total" },
          { label: "Guest Units", value: guestUnits.toFixed(1), caption: "hosted meals" },
          { label: "Auto Plans", value: activeMealSettings, caption: "members enabled" },
        ]}

        actions={
          isAdmin && (

            <div className="flex gap-2">

              <Button
                variant="secondary"
                onClick={() =>
                  setShowGuestMeal(
                    true
                  )
                }
              >
                <Users size={16} />
                Guest Meal
              </Button>

              <Button
                onClick={() =>
                  setShowAddMeal(
                    true
                  )
                }
              >
                <Plus size={16} />
                Add Meal
              </Button>

            </div>
          )
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Filtered Units" value={totalUnits.toFixed(1)} caption="meal units in view" icon={Activity} tone="accent" />
        <MetricCard label="Regular Entries" value={meals.length} caption="member meal records" icon={UtensilsCrossed} tone="blue" />
        <MetricCard label="Guest Entries" value={guestMeals.length} caption="guest meal records" icon={Users} tone="orange" />
        <MetricCard label="Recurring Plans" value={activeMealSettings} caption="automatic daily meals" icon={CalendarDays} tone="green" />
      </div>



      {/* FILTERS */}

      <FilterSurface>

        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by member or date..."
          className="flex-1"
        />

        {isAdmin && (

          <Select
            value={filterMember}
            onChange={(e) =>
              setFilterMember(
                e.target.value
              )
            }
            wrapperClass="sm:w-44"
          >

            <option value="all">
              All Members
            </option>

            {members.map((m) => (
              <option
                key={m.id}
                value={m.id}
              >
                {m.name}
              </option>
            ))}

          </Select>
        )}

        <Input
          type="date"
          value={filterDate}
          onChange={(e) =>
            setFilterDate(
              e.target.value
            )
          }
          wrapperClass="sm:w-44"
        />

        {filterDate && (

          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setFilterDate("")
            }
          >
            Clear Date
          </Button>
        )}

      </FilterSurface>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        <PremiumSection
          className="xl:col-span-2"
          title="Member Meal Heatmap"
          subtitle="Relative consumption intensity for the selected period"
        >
          <MiniBarList
            items={memberMealSummary}
            format={(value) => `${value.toFixed(1)} units`}
          />
        </PremiumSection>

        <PremiumSection title="Today Readiness" subtitle="Recurring meal switches">
          <div className="space-y-3">
            {members.slice(0, 5).map((member) => {
              const setting = getMealSetting(member.id);
              const enabled = ["breakfast", "lunch", "dinner"].filter((key) => setting[key]);
              return (
                <div key={member.id} className="flex items-center justify-between gap-3 rounded-2xl theme-muted p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <PersonAvatar name={member.name} size="sm" status={enabled.length ? "active" : "inactive"} />
                    <div className="min-w-0">
                      <p className="font-bold theme-text text-sm truncate">{member.name}</p>
                      <p className="text-xs theme-muted-text truncate">
                        {enabled.length ? enabled.join(", ") : "No recurring meal"}
                      </p>
                    </div>
                  </div>
                  <Badge variant={enabled.length ? "success" : "default"}>{enabled.length}/3</Badge>
                </div>
              );
            })}
          </div>
        </PremiumSection>
      </div>



      {/* PERMANENT MEAL SYSTEM */}

<Card className="relative mb-6 border border-white/10 bg-gradient-to-br from-[#111827] via-[#0f172a] to-[#111827] shadow-2xl overflow-hidden">

{/* TOP GLOW */}

  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.15),transparent_35%)] pointer-events-none" />

  <div className="relative p-6">

{/* HEADER */}

<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-7">

  <div className="flex items-center gap-4">

    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/20 flex items-center justify-center shadow-lg shadow-violet-500/10">

      <UtensilsCrossed
        size={22}
        className="text-violet-400"
      />

    </div>



    <div>

      <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">

        Permanent Meal System

      </h2>

      <p className="text-sm text-gray-400 mt-1">

        Enable automatic daily meals for members

      </p>

    </div>

  </div>



  <Badge variant="purple">

    {members.length} Members

  </Badge>

</div>



{/* MEMBERS */}

<div className="space-y-4">

  {members.map((member, idx) => {

    const setting =
      getMealSetting(
        member.id
      );



    const toggleMeal =
      async (field) => {

        const updated = {

          breakfast:
            setting.breakfast,

          lunch:
            setting.lunch,

          dinner:
            setting.dinner,

          [field]:
            !setting[field],
        };



        try {

          await saveMealSettings(
            ownerId,
            member.id,
            updated
          );



          toast.success(
            `${member.name} ${field} ${
              updated[field]
                ? "enabled"
                : "disabled"
            }`
          );

        } catch (err) {

          console.error(err);

          toast.error(
            "Update failed"
          );
        }
      };



    return (

      <motion.div
        key={member.id}

        initial={{
          opacity: 0,
          y: 14,
        }}

        animate={{
          opacity: 1,
          y: 0,
        }}

        transition={{
          delay: idx * 0.04,
          duration: 0.25,
        }}

        whileHover={{
          y: -2,
        }}

        className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.06] transition-all duration-300"
      >

        {/* HOVER GLOW */}

        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.10),transparent_40%)] transition-opacity duration-300" />



        <div className="relative p-5 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">

          {/* MEMBER INFO */}

          <div className="flex items-center gap-4 min-w-0">

            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500/15 to-indigo-500/15 border border-violet-500/10 flex items-center justify-center text-violet-300 font-black text-sm shadow-inner flex-shrink-0">

              {member.name
                ?.charAt(0)
                ?.toUpperCase()}

            </div>



            <div className="min-w-0">

              <p className="font-bold text-white truncate">

                {member.name}

              </p>

              <p className="text-xs text-gray-400 mt-1">

                Configure recurring meal preferences

              </p>

            </div>

          </div>



          {/* TOGGLES */}

          <div className="flex flex-wrap gap-3">

            {[
              {
                key: "breakfast",
                icon: Coffee,
                active:
                  "from-orange-500 to-amber-500",
              },

              {
                key: "lunch",
                icon: Sun,
                active:
                  "from-yellow-500 to-orange-500",
              },

              {
                key: "dinner",
                icon: Moon,
                active:
                  "from-blue-500 to-indigo-500",
              },
            ].map((meal) => {

              const Icon =
                meal.icon;

              const active =
                setting[
                  meal.key
                ];



              return (

                <motion.button
                  key={meal.key}

                  whileTap={{
                    scale: 0.96,
                  }}

                  onClick={() =>
                    toggleMeal(
                      meal.key
                    )
                  }

                  className={`
                    relative overflow-hidden flex items-center gap-2 px-5 py-2.5 rounded-2xl border text-sm font-semibold capitalize transition-all duration-300

                    ${
                      active
                        ? `bg-gradient-to-r ${meal.active} text-white border-transparent shadow-lg`
                        : "bg-white/[0.03] border-white/10 text-gray-300 hover:bg-white/[0.08] hover:text-white"
                    }
                  `}
                >

                  <Icon size={15} />

                  {meal.key}

                </motion.button>
              );
            })}

          </div>

        </div>

      </motion.div>
    );
  })}

</div>
  </div>

</Card>




      {/* TABLE */}

      <Card noPad>

        <Table
          columns={columns}
          data={filtered}

          emptyState={

            <div className="p-12">

              <EmptyState
                icon={
                  UtensilsCrossed
                }

                title="No meals found"

                description={
                  isAdmin
                    ? "Add meal entries for your mess members."
                    : "No meals recorded yet."
                }

                action={
                  isAdmin && (

                    <Button
                      onClick={() =>
                        setShowAddMeal(
                          true
                        )
                      }
                    >
                      <Plus size={16} />
                      Add Meal
                    </Button>
                  )
                }
              />

            </div>
          }
        />

      </Card>



      {/* MODALS */}

      <AnimatePresence>

        {showAddMeal && (

          <Modal
            open
            onClose={() =>
              setShowAddMeal(
                false
              )
            }
            title="Add Meal Entry"
          >

            <MealEntryForm
              members={members}
              ownerId={ownerId}
              onClose={() =>
                setShowAddMeal(
                  false
                )
              }
            />

          </Modal>
        )}



        {editMeal && (

          <Modal
            open
            onClose={() =>
              setEditMeal(null)
            }
            title="Edit Meal"
          >

            <MealEntryForm
              members={members}
              ownerId={ownerId}
              initial={editMeal}
              onClose={() =>
                setEditMeal(null)
              }
            />

          </Modal>
        )}



        {showGuestMeal && (

          <Modal
            open
            onClose={() =>
              setShowGuestMeal(
                false
              )
            }
            title="Add Guest Meal"

            subtitle="Track meals for guests hosted by members"
          >

            <GuestMealForm
              members={members}
              ownerId={ownerId}
              onClose={() =>
                setShowGuestMeal(
                  false
                )
              }
            />

          </Modal>
        )}



        {delId && (

          <Modal
            open
            onClose={() =>
              setDelId(null)
            }
            title="Delete Meal"
            size="sm"
          >

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Delete this meal entry permanently?
            </p>

            <div className="flex gap-3">

              <Button
                variant="danger"
                loading={loading}
                onClick={
                  handleDelete
                }
                className="flex-1"
              >
                Delete
              </Button>

              <Button
                variant="secondary"
                onClick={() =>
                  setDelId(null)
                }
                className="flex-1"
              >
                Cancel
              </Button>

            </div>

          </Modal>
        )}

      </AnimatePresence>

    </PageWrapper>
  );
}

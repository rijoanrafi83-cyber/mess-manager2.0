import {
  useState,
  useMemo,
  useCallback
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
  Activity,
  Check,
  X,
  Power,
  Sparkles
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
  deleteMealWithAutoSkip,
  addGuestMeal,
  deleteGuestMeal,
  saveMealSettings
} from "../services/firestoreService";

import { calculateMealCount } from "../utils/billing";
import {
  MEAL_KEYS,
  getEnabledMealKeys,
  getAutoMealPreview,
  getTodayAutoMealStats,
  isAutoPermanentMeal,
  getSettingForMember
} from "../utils/permanentMeals";



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


const mealMeta = {
  breakfast: {
    label: "Breakfast",
    icon: Coffee,
    active: "bg-orange-500 text-white shadow-orange-500/25",
    soft: "bg-orange-500/10 text-orange-600 dark:text-orange-300",
  },
  lunch: {
    label: "Lunch",
    icon: Sun,
    active: "bg-amber-500 text-white shadow-amber-500/25",
    soft: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
  },
  dinner: {
    label: "Dinner",
    icon: Moon,
    active: "bg-sky-500 text-white shadow-sky-500/25",
    soft: "bg-sky-500/10 text-sky-600 dark:text-sky-300",
  },
};

function PermanentMealManager({
  members,
  meals,
  mealSettings,
  ownerId,
  isAdmin,
  stats,
}) {
  const [savingKey, setSavingKey] =
    useState("");

  const toggleMemberMeal =
    async (member, field) => {
      if (!isAdmin || !ownerId) return;

      const setting =
        getSettingForMember(
          mealSettings,
          member.id
        );

      const updated = {
        breakfast: Boolean(setting.breakfast),
        lunch: Boolean(setting.lunch),
        dinner: Boolean(setting.dinner),
        [field]: !setting[field],
      };

      setSavingKey(`${member.id}_${field}`);

      try {
        await saveMealSettings(
          ownerId,
          member.id,
          updated
        );

        toast.success(
          `${member.name} ${mealMeta[field].label} ${
            updated[field] ? "enabled" : "disabled"
          }`
        );
      } catch (err) {
        console.error(err);
        toast.error("Permanent meal update failed");
      } finally {
        setSavingKey("");
      }
    };

  const setAllForMeal =
    async (field, value) => {
      if (!isAdmin || !ownerId) return;

      setSavingKey(`bulk_${field}_${value}`);

      try {
        await Promise.all(
          members.map((member) => {
            const setting =
              getSettingForMember(
                mealSettings,
                member.id
              );

            return saveMealSettings(
              ownerId,
              member.id,
              {
                breakfast: Boolean(setting.breakfast),
                lunch: Boolean(setting.lunch),
                dinner: Boolean(setting.dinner),
                [field]: value,
              }
            );
          })
        );

        toast.success(
          `${mealMeta[field].label} ${value ? "enabled" : "disabled"} for all members`
        );
      } catch (err) {
        console.error(err);
        toast.error("Bulk permanent meal update failed");
      } finally {
        setSavingKey("");
      }
    };

  return (
    <Card className="mb-6 overflow-hidden p-0 border-white/20 dark:border-white/10 bg-white/75 dark:bg-white/[0.04] backdrop-blur-xl">
      <div className="p-5 md:p-6 border-b border-gray-200/70 dark:border-white/10">
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl theme-accent-bg text-white flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Sparkles size={20} />
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-wider theme-muted-text">
                Automatic Meal Control
              </p>
              <h2 className="text-xl md:text-2xl font-black theme-text mt-1">
                Permanent Meal System
              </h2>
              <p className="text-sm theme-muted-text mt-1 max-w-2xl">
                ON meals are written into today's meal history as editable Firestore meal entries, then counted everywhere like normal meals.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 min-w-full sm:min-w-[420px]">
            <div className="rounded-2xl theme-muted p-3">
              <p className="text-[11px] font-bold uppercase theme-muted-text">
                Enabled
              </p>
              <p className="text-xl font-black theme-text">
                {stats.membersEnabled}
              </p>
            </div>
            <div className="rounded-2xl theme-muted p-3">
              <p className="text-[11px] font-bold uppercase theme-muted-text">
                Today Rows
              </p>
              <p className="text-xl font-black theme-text">
                {stats.entries}
              </p>
            </div>
            <div className="rounded-2xl theme-muted p-3">
              <p className="text-[11px] font-bold uppercase theme-muted-text">
                Today Units
              </p>
              <p className="text-xl font-black theme-text">
                {stats.units.toFixed(1)}
              </p>
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="flex flex-wrap items-center gap-3 mt-6">
            {MEAL_KEYS.map((key) => {
              const meta = mealMeta[key];

              return (
                <div
                  key={key}
                  className="flex items-center gap-2 rounded-2xl theme-muted p-1.5"
                >
                  <span className="pl-2 text-xs font-bold theme-muted-text">
                    {meta.label}
                  </span>
                  <Button
                    size="xs"
                    variant="success"
                    disabled={Boolean(savingKey)}
                    onClick={() => setAllForMeal(key, true)}
                  >
                    All ON
                  </Button>
                  <Button
                    size="xs"
                    variant="danger"
                    disabled={Boolean(savingKey)}
                    onClick={() => setAllForMeal(key, false)}
                  >
                    All OFF
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="theme-muted">
              <th className="text-left px-5 py-4 text-xs font-black uppercase theme-muted-text">
                Member
              </th>
              {MEAL_KEYS.map((key) => (
                <th
                  key={key}
                  className="text-center px-4 py-4 text-xs font-black uppercase theme-muted-text"
                >
                  {mealMeta[key].label}
                </th>
              ))}
              <th className="text-center px-5 py-4 text-xs font-black uppercase theme-muted-text">
                Status
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[var(--border-soft)]">
            {members.map((member, index) => {
              const setting =
                getSettingForMember(
                  mealSettings,
                  member.id
                );
              const preview =
                getAutoMealPreview({
                  meals,
                  mealSettings,
                  memberId:
                    member.id,
                });
              const enabled =
                preview.enabled;

              return (
                <motion.tr
                  key={member.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.025 }}
                  className="hover:bg-[var(--bg-card-muted)] transition-colors"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <PersonAvatar
                        name={member.name}
                        size="sm"
                        status={enabled.length ? "active" : "inactive"}
                      />
                      <div className="min-w-0">
                        <p className="font-black theme-text truncate">
                          {member.name}
                        </p>
                        <p className="text-xs theme-muted-text truncate">
                          {preview.overridden
                            ? "Today manually overridden"
                            : preview.generatedKeys.length
                              ? `Generated today: ${preview.generatedKeys.join(", ")}`
                              : member.room ? `Room ${member.room}` : member.email || "No room assigned"}
                        </p>
                      </div>
                    </div>
                  </td>

                  {MEAL_KEYS.map((key) => {
                    const active =
                      Boolean(setting[key]);
                    const Icon =
                      active ? Check : X;
                    const meta =
                      mealMeta[key];

                    return (
                      <td
                        key={key}
                        className="px-4 py-4 text-center"
                      >
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.94 }}
                          disabled={!isAdmin || Boolean(savingKey)}
                          onClick={() =>
                            toggleMemberMeal(
                              member,
                              key
                            )
                          }
                          className={`relative inline-flex h-12 w-16 items-center justify-center rounded-2xl border transition-all duration-300 ${
                            active
                              ? `${meta.active} border-transparent shadow-lg`
                              : "theme-muted border-gray-200/70 dark:border-white/10 theme-muted-text hover:bg-[var(--bg-card)]"
                          } ${!isAdmin ? "cursor-default" : "hover:-translate-y-0.5"}`}
                          aria-label={`${active ? "Disable" : "Enable"} ${meta.label} for ${member.name}`}
                        >
                          <Icon size={18} />
                          {active && (
                            <motion.span
                              layoutId={`meal-dot-${member.id}-${key}`}
                              className="absolute right-2 top-2 h-2 w-2 rounded-full bg-white/80"
                            />
                          )}
                        </motion.button>
                      </td>
                    );
                  })}

                  <td className="px-5 py-4 text-center">
                    <Badge
                      variant={enabled.length ? "success" : "default"}
                      className="rounded-full px-3 py-1"
                    >
                      <Power size={12} />
                      {enabled.length} / 3 ON
                    </Badge>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}



/* =========================================================
   MAIN PAGE
========================================================= */

export function MealsPage({
  members = [],
  meals = [],
  guestMeals = [],
  mealSettings = [],
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

  const isAdmin =
    userProfile?.role === "admin";



  const getMealSetting =
    (memberId) => {

      return getSettingForMember(
        mealSettings,
        memberId
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

  const permanentStats =
    useMemo(
      () =>
        getTodayAutoMealStats({
          meals,
          mealSettings,
        }),
      [
        meals,
        mealSettings
      ]
    );

  const activeMealSettings =
    permanentStats.membersEnabled;

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

          await deleteMealWithAutoSkip(
            ownerId,
            meal || { id: delId }
          );
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

    }, [delId, filtered, ownerId]);



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
        const isPermanent =
          isAutoPermanentMeal(row);

        return (

          <div className="flex items-center gap-2">

            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                isGuest
                  ? "bg-orange-500/10 text-orange-500"
                  : isPermanent
                    ? "bg-emerald-500/10 text-emerald-500"
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

              {isPermanent && (
                <span className="text-xs text-emerald-500">
                  Auto permanent meal
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
              : isAutoPermanentMeal(row)
                ? "success"
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

      <PermanentMealManager
        members={members}
        meals={meals}
        mealSettings={mealSettings}
        ownerId={ownerId}
        isAdmin={isAdmin}
        stats={permanentStats}
      />

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

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
  Edit2
} from "lucide-react";

import {
  PageWrapper,
  PageHeader,
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

      <PageHeader
        title="Meals"

        subtitle={`${filtered.length} meal entries · ${totalUnits.toFixed(
          1
        )} total units`}

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



      {/* FILTERS */}

      <div className="flex flex-col sm:flex-row gap-3 mb-6">

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

      </div>



      {/* PERMANENT MEAL SYSTEM */}

      <Card className="mb-6">

        <div className="p-5">

          <h2 className="text-lg font-bold mb-5">
            Permanent Meal System
          </h2>

          <div className="space-y-4">

            {members.map((member) => {

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
                          ? "ON"
                          : "OFF"
                      }`
                    );

                  } catch (err) {

                    console.error(
                      err
                    );

                    toast.error(
                      "Update failed"
                    );
                  }
                };



              return (

                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 border rounded-xl"
                >

                  <p className="font-medium">
                    {member.name}
                  </p>

                  <div className="flex gap-2">

                    {[
                      "breakfast",
                      "lunch",
                      "dinner",
                    ].map((meal) => (

                      <Button
                        key={meal}
                        size="sm"

                        variant={
                          setting[
                            meal
                          ]
                            ? "primary"
                            : "secondary"
                        }

                        onClick={() =>
                          toggleMeal(
                            meal
                          )
                        }
                      >
                        {meal}
                      </Button>
                    ))}

                  </div>

                </div>
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
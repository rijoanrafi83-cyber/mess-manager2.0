import {
  useState,
  useMemo,
  useCallback
} from "react";

import {
  motion,
  AnimatePresence
} from "framer-motion";

import toast from "react-hot-toast";

import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Phone,
  Home,
  Calendar,
  Shield,
  Eye,
  UserCheck,
  UserX,
  Wallet,
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
  Table
} from "../components/ui";
import {
  FilterSurface,
  MetricCard,
  PersonAvatar,
  SmartHero,
  SmartSection,
} from "../components/SmartUI";

import {
  addMember,
  deleteMember,
  updateMember
} from "../services/firestoreService";



const MEMBER_STATUS = [
  "active",
  "inactive"
];

const defaultForm = {

  name: "",
  phone: "",
  roomNumber: "",

  status: "active",

  joinDate:
    new Date()
      .toISOString()
      .split("T")[0],
};



/* =========================================================
   MEMBER AVATAR
========================================================= */

function MemberAvatar({
  name,
  size = "md"
}) {

  const initials =
    (name || "?")
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

  const sz = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-14 h-14 text-xl",
  };

  const colors = [
    "from-violet-500 to-indigo-500",
    "from-blue-500 to-cyan-500",
    "from-teal-500 to-green-500",
    "from-orange-500 to-red-500",
    "from-pink-500 to-rose-500",
  ];

  const idx =
    (name || "")
      .charCodeAt(0) %
    colors.length;

  return (

    <div
      className={`${sz[size]} rounded-xl bg-gradient-to-br ${colors[idx]} flex items-center justify-center text-white font-bold flex-shrink-0`}
    >
      {initials}
    </div>
  );
}



/* =========================================================
   MEMBER FORM
========================================================= */

function MemberForm({
  initial = defaultForm,
  onSubmit,
  loading,
  onCancel
}) {

  const [form, setForm] =
    useState({
      ...defaultForm,
      ...initial,
    });

  const [errors, setErrors] =
    useState({});

  const set = (k, v) =>
    setForm((f) => ({
      ...f,
      [k]: v,
    }));



  const validate = () => {

    const e = {};

    if (!form.name.trim()) {
      e.name = "Name is required";
    }

    setErrors(e);

    return (
      Object.keys(e).length === 0
    );
  };



  const handleSubmit =
    async (e) => {

      e.preventDefault();

      if (!validate()) return;

      await onSubmit(form);
    };



  return (

    <form
      onSubmit={handleSubmit}
      className="space-y-4"
    >

      <div className="grid grid-cols-2 gap-4">

        <Input
          label="Full Name"
          value={form.name}
          onChange={(e) =>
            set(
              "name",
              e.target.value
            )
          }
          error={errors.name}
          required
        />

        <Input
          label="Phone"
          value={form.phone}
          onChange={(e) =>
            set(
              "phone",
              e.target.value
            )
          }
          placeholder="+880..."
        />

        <Input
          label="Room Number"
          value={form.roomNumber}
          onChange={(e) =>
            set(
              "roomNumber",
              e.target.value
            )
          }
          placeholder="101"
        />

        <Select
          label="Status"
          value={form.status}
          onChange={(e) =>
            set(
              "status",
              e.target.value
            )
          }
        >

          {MEMBER_STATUS.map(
            (s) => (

              <option
                key={s}
                value={s}
              >
                {s
                  .charAt(0)
                  .toUpperCase() +
                  s.slice(1)}
              </option>
            )
          )}

        </Select>



        <Input
          label="Join Date"
          type="date"
          value={form.joinDate}
          onChange={(e) =>
            set(
              "joinDate",
              e.target.value
            )
          }
        />

      </div>



      <div className="flex gap-3 pt-2">

        <Button
          type="submit"
          loading={loading}
          className="flex-1"
        >
          Save Member
        </Button>

        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
        >
          Cancel
        </Button>

      </div>

    </form>
  );
}



/* =========================================================
   MEMBER PROFILE MODAL
========================================================= */

function MemberProfileModal({
  member,
  onClose,
  billData
}) {

  if (!member) return null;

  const bill =
    billData?.memberBills?.find(
      (b) => b.id === member.id
    ) || {};



  return (

    <Modal
      open
      onClose={onClose}
      title="Member Profile"
      size="md"
    >

      <div className="space-y-5">

        <div className="flex items-center gap-4">

          <MemberAvatar
            name={member.name}
            size="lg"
          />

          <div>

            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {member.name}
            </h3>

            <p className="text-sm text-gray-500 dark:text-gray-400">
              {member.roomNumber
                ? `Room ${member.roomNumber}`
                : member.phone || "No contact added"}
            </p>

            <div className="flex gap-2 mt-2">

              <Badge
                variant={
                  member.status ===
                  "active"
                    ? "success"
                    : "warning"
                }
              >
                {member.status}
              </Badge>

            </div>

          </div>

        </div>



        <div className="grid grid-cols-2 gap-3">

          {[
            {
              label: "Phone",
              value:
                member.phone || "—",
              icon: Phone,
            },

            {
              label: "Room",
              value:
                member.roomNumber ||
                "—",
              icon: Home,
            },

            {
              label: "Joined",
              value:
                member.joinDate ||
                "—",
              icon: Calendar,
            },

          ].map(
            ({
              label,
              value,
              icon: Icon
            }) => (

              <div
                key={label}
                className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 dark:bg-white/5"
              >

                <Icon
                  size={14}
                  className="text-gray-400 flex-shrink-0"
                />

                <div>

                  <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">
                    {label}
                  </p>

                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {value}
                  </p>

                </div>

              </div>
            )
          )}

        </div>



        {/* BILL SUMMARY */}

        <div className="p-4 rounded-xl bg-violet-50 dark:bg-violet-500/10 border border-violet-100 dark:border-violet-500/20">

          <p className="text-xs font-semibold text-violet-700 dark:text-violet-400 uppercase tracking-wide mb-3">
            Billing Summary
          </p>

          <div className="grid grid-cols-2 gap-y-2 text-sm">

            {[
              [
                "Total Meals",
                `${(
                  bill.meals || 0
                ).toFixed(1)} units`
              ],

              [
                "Meal Cost",
                `৳${(
                  bill.mealCost || 0
                ).toFixed(2)}`
              ],

              [
                "Deposit",
                `৳${(
                  bill.deposit || 0
                ).toFixed(2)}`
              ],

              [
                "Balance",
                `৳${(
                  bill.balance || 0
                ).toFixed(2)}`
              ],
            ].map(([k, v]) => (

              <div key={k}>

                <p className="text-xs text-violet-600 dark:text-violet-300 opacity-70">
                  {k}
                </p>

                <p className="font-bold text-violet-700 dark:text-violet-200">
                  {v}
                </p>

              </div>
            ))}

          </div>



          {bill.due > 0 && (

            <p className="text-xs text-red-500 font-semibold mt-2 pt-2 border-t border-violet-200 dark:border-violet-500/20">

              ⚠ Due:
              {" "}
              ৳{bill.due.toFixed(2)}

            </p>
          )}

        </div>

      </div>

    </Modal>
  );
}



/* =========================================================
   MAIN PAGE
========================================================= */

export function MembersPage({
  members = [],
  ownerId,
  billData,
  userProfile
}) {

  const [search, setSearch] =
    useState("");

  const [
    statusFilter,
    setStatusFilter
  ] = useState("all");

  const [
    showAddModal,
    setShowAddModal
  ] = useState(false);

  const [editMember, setEditMember] =
    useState(null);

  const [viewMember, setViewMember] =
    useState(null);

  const [delId, setDelId] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const [page, setPage] =
    useState(1);

  const PER_PAGE = 10;
  const canManageUsers =
    userProfile?.role === "admin";

  const memberBills = useMemo(
    () => billData?.memberBills || [],
    [billData?.memberBills]
  );

  const activeMembers = members.filter((m) => m.status === "active").length;

  const inactiveMembers = members.filter((m) => m.status === "inactive").length;

  const totalDue = memberBills.reduce(
    (sum, member) => sum + Math.max(0, Number(member.due || 0)),
    0
  );



  const filtered =
    useMemo(() => {

      let list = members;

      if (search) {

        list = list.filter(
          (m) =>

            m.name
              ?.toLowerCase()
              .includes(
                search.toLowerCase()
              ) ||

            m.roomNumber
              ?.toLowerCase()
              .includes(
                search.toLowerCase()
              )
        );
      }

      if (
        statusFilter !== "all"
      ) {

        list = list.filter(
          (m) =>
            m.status ===
            statusFilter
        );
      }

      return list;

    }, [
      members,
      search,
      statusFilter
    ]);



  const paginated =
    useMemo(() => {

      const start =
        (page - 1) *
        PER_PAGE;

      return filtered.slice(
        start,
        start + PER_PAGE
      );

    }, [filtered, page]);

  const memberCards = useMemo(
    () =>
      filtered.slice(0, 6).map((member) => ({
        ...member,
        bill: memberBills.find((bill) => bill.id === member.id) || {},
      })),
    [filtered, memberBills]
  );



  const totalPages =
    Math.ceil(
      filtered.length /
      PER_PAGE
    );



  const handleAdd =
    useCallback(
      async (form) => {

        setLoading(true);

        try {

          await addMember(ownerId, form, userProfile);

          toast.success(
            "Member added!"
          );

          setShowAddModal(
            false
          );

        } catch (err) {

          toast.error(
            err.message || "Failed to add member"
          );

        } finally {

          setLoading(false);
        }

      },
      [ownerId, userProfile]
    );



  const handleEdit =
    useCallback(
      async (form) => {

        setLoading(true);

        try {

          await updateMember(
            editMember.id,
            {
              ...form,
              ownerId,
            },
            userProfile,
            ownerId
          );

          toast.success(
            "Member updated!"
          );

          setEditMember(null);

        } catch (err) {

          toast.error(
            err.message || "Failed to update member"
          );

        } finally {

          setLoading(false);
        }

      },
      [editMember, ownerId, userProfile]
    );



  const handleDelete =
    useCallback(async () => {

      if (!delId) return;

      setLoading(true);

      try {

        await deleteMember(delId, userProfile, ownerId);

        toast.success(
          "Member deleted"
        );

        setDelId(null);

      } catch (err) {

        toast.error(
          err.message || "Failed to delete member"
        );

      } finally {

        setLoading(false);
      }

    }, [delId, ownerId, userProfile]);



  const columns = [

    {
      key: "name",
      label: "Member",

      render: (_, row) => (

        <div className="flex items-center gap-3">

          <MemberAvatar
            name={row.name}
            size="sm"
          />

          <div>

            <p className="font-medium text-gray-900 dark:text-white text-sm">
              {row.name}
            </p>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              {row.roomNumber
                ? `Room ${row.roomNumber}`
                : row.phone || "No contact"}
            </p>

          </div>

        </div>
      )
    },



    {
      key: "phone",
      label: "Phone",

      render: (v) =>
        v || "—"
    },



    {
      key: "roomNumber",
      label: "Room",

      render: (v) =>
        v || "—"
    },



    {
      key: "joinDate",
      label: "Joined",

      render: (v) =>
        v || "—"
    },



    {
      key: "status",
      label: "Status",

      render: (v) => (

        <Badge
          variant={
            v === "active"
              ? "success"
              : "warning"
          }
        >
          {v}
        </Badge>
      )
    },



    canManageUsers && {
      key: "id",
      label: "Actions",

      render: (id, row) => (

        <div className="flex items-center gap-1">

          <Button
            variant="ghost"
            size="xs"
            onClick={(e) => {

              e.stopPropagation();

              setViewMember(row);
            }}
          >
            <Eye size={13} />
          </Button>



          <Button
            variant="ghost"
            size="xs"
            onClick={(e) => {

              e.stopPropagation();

              setEditMember(row);
            }}
          >
            <Edit2 size={13} />
          </Button>



          <Button
            variant="danger"
            size="xs"
            onClick={(e) => {

              e.stopPropagation();

              setDelId(id);
            }}
          >
            <Trash2 size={13} />
          </Button>

        </div>
      )
    },
  ].filter(Boolean);



  return (

    <PageWrapper>

      <SmartHero
        eyebrow="Member Workspace"
        title="Members"
        subtitle="Manage residents with fast search, profile side views, status signals, and billing visibility."
        metrics={[
          { label: "Registered", value: members.length, caption: "total members" },
          { label: "Active", value: activeMembers, caption: "meal eligible" },
          { label: "Inactive", value: inactiveMembers, caption: "paused accounts" },
          { label: "Open Due", value: `৳${totalDue.toFixed(0)}`, caption: "from reports" },
        ]}

        actions={
          canManageUsers ? (

          <Button
            onClick={() =>
              setShowAddModal(
                true
              )
            }
          >
            <Plus size={16} />
            Add Member
          </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Active Members" value={activeMembers} caption="ready for meal tracking" icon={UserCheck} tone="green" />
        <MetricCard label="Inactive Members" value={inactiveMembers} caption="filtered separately" icon={UserX} tone="orange" />
        <MetricCard label="Pending Collection" value={`৳${totalDue.toFixed(0)}`} caption="open member due" icon={Wallet} tone={totalDue > 0 ? "red" : "green"} />
        <MetricCard label="Shared Access" value="Settings" caption="member and manager login" icon={Shield} tone="blue" />
      </div>

      {memberCards.length > 0 && (
        <SmartSection
          title="Member Snapshot"
          subtitle="Quick profile and billing signals for the current filter"
          className="mb-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {memberCards.map((member) => (
              <motion.button
                key={member.id}
                type="button"
                whileHover={{ y: -3 }}
                onClick={() => setViewMember(member)}
                className="text-left rounded-2xl border theme-muted hover:bg-[var(--bg-card)] p-4 transition-all"
              >
                <div className="flex items-start gap-3">
                  <PersonAvatar name={member.name} status={member.status} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-black theme-text truncate">{member.name}</p>
                      <Badge variant={member.status === "active" ? "success" : "warning"}>
                        {member.status}
                      </Badge>
                    </div>
                    <p className="text-xs theme-muted-text truncate mt-1">
                      {member.roomNumber ? `Room ${member.roomNumber}` : member.phone || "No contact"}
                    </p>
                    <div className="grid grid-cols-3 gap-2 mt-4 text-xs">
                      <div>
                        <p className="theme-muted-text">Meals</p>
                        <p className="font-black theme-text">{(member.bill.meals || 0).toFixed(1)}</p>
                      </div>
                      <div>
                        <p className="theme-muted-text">Deposit</p>
                        <p className="font-black theme-text">৳{(member.bill.deposit || 0).toFixed(0)}</p>
                      </div>
                      <div>
                        <p className="theme-muted-text">Due</p>
                        <p className={`font-black ${member.bill.due > 0 ? "text-red-500" : "text-emerald-500"}`}>
                          ৳{Math.max(0, member.bill.due || 0).toFixed(0)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </SmartSection>
      )}



      {/* FILTERS */}

      <FilterSurface>

        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name or room..."
          className="flex-1"
        />

        <Select
          value={statusFilter}
          onChange={(e) => {

            setStatusFilter(
              e.target.value
            );

            setPage(1);
          }}

          wrapperClass="sm:w-36"
        >

          <option value="all">
            All Status
          </option>

          <option value="active">
            Active
          </option>

          <option value="inactive">
            Inactive
          </option>

        </Select>

      </FilterSurface>



      {/* TABLE */}

      <Card noPad>

        <Table
          columns={columns}
          data={paginated}

          onRowClick={(row) =>
            setViewMember(row)
          }

          emptyState={

            <div className="p-12">

              <EmptyState
                icon={Users}

                title="No members found"

                description="Add your first member to get started."

                action={
                  canManageUsers ? (

                  <Button
                    onClick={() =>
                      setShowAddModal(
                        true
                      )
                    }
                  >
                    <Plus size={16} />
                    Add Member
                  </Button>
                  ) : null
                }
              />

            </div>
          }
        />



        {/* PAGINATION */}

        {totalPages > 1 && (

          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-white/8">

            <p className="text-xs text-gray-500 dark:text-gray-400">

              Showing
              {" "}
              {(page - 1) *
                PER_PAGE +
                1}

              –
              {Math.min(
                page *
                  PER_PAGE,
                filtered.length
              )}

              {" "}
              of
              {" "}
              {filtered.length}

            </p>



            <div className="flex gap-2">

              <Button
                variant="secondary"
                size="xs"

                disabled={
                  page === 1
                }

                onClick={() =>
                  setPage(
                    (p) => p - 1
                  )
                }
              >
                Prev
              </Button>



              {[...Array(totalPages)]
                .map((_, i) => (

                  <button
                    key={i}

                    onClick={() =>
                      setPage(i + 1)
                    }

                    className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                      page === i + 1
                        ? "bg-violet-600 text-white"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/8"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}



              <Button
                variant="secondary"
                size="xs"

                disabled={
                  page === totalPages
                }

                onClick={() =>
                  setPage(
                    (p) => p + 1
                  )
                }
              >
                Next
              </Button>

            </div>

          </div>
        )}

      </Card>



      {/* ADD MODAL */}

      <AnimatePresence>

        {showAddModal && canManageUsers && (

          <Modal
            open

            onClose={() =>
              setShowAddModal(
                false
              )
            }

            title="Add New Member"

            subtitle="Fill in the member details below"
          >

            <MemberForm
              onSubmit={
                handleAdd
              }

              loading={loading}

              onCancel={() =>
                setShowAddModal(
                  false
                )
              }
            />

          </Modal>
        )}

      </AnimatePresence>



      {/* EDIT MODAL */}

      <AnimatePresence>

        {editMember && canManageUsers && (

          <Modal
            open

            onClose={() =>
              setEditMember(null)
            }

            title="Edit Member"
          >

            <MemberForm
              initial={editMember}

              onSubmit={
                handleEdit
              }

              loading={loading}

              onCancel={() =>
                setEditMember(null)
              }
            />

          </Modal>
        )}

      </AnimatePresence>



      {/* PROFILE MODAL */}

      <AnimatePresence>

        {viewMember && (

          <MemberProfileModal
            member={viewMember}

            onClose={() =>
              setViewMember(null)
            }

            billData={billData}
          />
        )}

      </AnimatePresence>



      {/* DELETE CONFIRM */}

      <AnimatePresence>

        {delId && canManageUsers && (

          <Modal
            open

            onClose={() =>
              setDelId(null)
            }

            title="Delete Member"
            size="sm"
          >

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">

              Are you sure?

              This will permanently remove the member and cannot be undone.

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

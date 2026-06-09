import {
  useEffect,
  useMemo,
  useState,
} from "react";

import toast from "react-hot-toast";
import {
  Archive,
  CalendarCheck,
  Download,
  FileText,
  Lock,
  RefreshCw,
  Users,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";

import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  PageWrapper,
  Select,
  Table,
} from "../components/UI";
import {
  MetricCard,
  SmartHero,
  SmartSection,
} from "../components/SmartUI";
import {
  closeMonthlyReport,
  subscribeMonthlyReports,
} from "../services/firestoreService";
import { formatCurrency } from "../utils/billing";
import { ROLES } from "../utils/roles";

const SCHEMA_VERSION = 1;

const getCurrentMonthKey = () => {
  const now = new Date();

  return `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}`;
};

const getMonthLabel = (monthKey) => {
  if (!monthKey) return "Unknown month";

  const [year, month] = monthKey.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);

  if (Number.isNaN(date.getTime())) {
    return monthKey;
  }

  return date.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });
};

const normalizeNumber = (value) =>
  Number.isFinite(Number(value)) ? Number(value) : 0;

const csvValue = (value) => {
  const text = String(value ?? "");

  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
};

function buildArchiveSnapshot({
  month,
  billData,
  members,
  meals,
  guestMeals,
  bazaar,
  deposits,
  extraCosts,
  settings,
  userProfile,
}) {
  const memberSummaries = (billData.memberBills || []).map((member) => ({
    memberId: member.memberId || member.id || null,
    name: member.name || member.displayName || "Unknown member",
    meals: normalizeNumber(member.meals),
    mealCost: normalizeNumber(member.mealCost),
    extraBillsTotal: normalizeNumber(member.extraBillsTotal),
    deposit: normalizeNumber(member.deposit || member.deposits),
    total: normalizeNumber(member.total),
    due: normalizeNumber(member.due),
    balance: normalizeNumber(member.balance),
  }));

  return {
    totals: {
      totalMeals: normalizeNumber(billData.totalMeals),
      totalGuestMeals: normalizeNumber(billData.totalGuestMeals),
      totalBazaar: normalizeNumber(billData.totalBazaar),
      totalExtra: normalizeNumber(billData.totalExtra),
      totalDeposits: normalizeNumber(billData.totalDeposits),
      totalDue: normalizeNumber(billData.totalDue),
      mealRate: normalizeNumber(billData.mealRate),
    },
    memberSummaries,
    sourceCounts: {
      members: members.length,
      meals: meals.length,
      guestMeals: guestMeals.length,
      bazaar: bazaar.length,
      deposits: deposits.length,
      extraCosts: extraCosts.length,
    },
    metadata: {
      currency: settings?.currency || "৳",
      messName: settings?.messName || "MessManager",
      closedByUid: userProfile?.uid || userProfile?.authUid || null,
      closedByName:
        userProfile?.displayName ||
        userProfile?.fullName ||
        userProfile?.email ||
        "Workspace user",
      closedByRole: userProfile?.role || "unknown",
      schemaVersion: SCHEMA_VERSION,
      monthLabel: getMonthLabel(month),
      note:
        "Closing a month creates an archived report snapshot. It does not delete, move, or reset current records.",
    },
  };
}

function formatTimestamp(value) {
  if (!value) return "Not available";

  const date = value?.toDate
    ? value.toDate()
    : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleString();
}

export default function ArchivePage({
  billData = {},
  members = [],
  meals = [],
  guestMeals = [],
  bazaar = [],
  deposits = [],
  extraCosts = [],
  settings = null,
  userProfile = null,
}) {
  const ownerId = userProfile?.ownerId;
  const canClose = userProfile?.role === ROLES.ADMIN;
  const currency = settings?.currency || "৳";
  const defaultMonth = settings?.activeMonth || getCurrentMonthKey();

  const [reports, setReports] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [closeMonthInput, setCloseMonthInput] = useState("");
  const [closing, setClosing] = useState(false);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const closeMonth = closeMonthInput || defaultMonth;

  useEffect(() => {
    if (!ownerId) {
      return undefined;
    }

    return subscribeMonthlyReports(ownerId, (items) => {
      setReports(items);
      setSelectedMonth((current) => current || items[0]?.month || "");
    });
  }, [ownerId]);

  const selectedReport = useMemo(
    () =>
      reports.find((report) => report.month === selectedMonth) ||
      reports[0] ||
      null,
    [reports, selectedMonth]
  );

  const existingCloseReport = useMemo(
    () => reports.find((report) => report.month === closeMonth),
    [closeMonth, reports]
  );

  const closeSnapshot = async ({ overwrite = false } = {}) => {
    if (!canClose || !ownerId || !closeMonth) return;

    if (existingCloseReport && !overwrite) {
      setConfirmOverwrite(true);
      return;
    }

    setClosing(true);

    try {
      const snapshot = buildArchiveSnapshot({
        month: closeMonth,
        billData,
        members,
        meals,
        guestMeals,
        bazaar,
        deposits,
        extraCosts,
        settings,
        userProfile,
      });

      const result = await closeMonthlyReport(
        ownerId,
        closeMonth,
        snapshot,
        userProfile
      );

      toast.success(
        `${getMonthLabel(result.month)} archived. Active month is now ${result.activeMonth}.`
      );
      setSelectedMonth(closeMonth);
      setConfirmOverwrite(false);
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Failed to close month");
    } finally {
      setClosing(false);
    }
  };

  const exportArchiveCSV = () => {
    if (!selectedReport) return;

    const rows = [
      [
        "Member",
        "Meals",
        "Meal Cost",
        "Extra Bills",
        "Deposit",
        "Total Bill",
        "Due",
        "Balance",
      ],
      ...(selectedReport.memberSummaries || []).map((member) => [
        member.name,
        member.meals,
        member.mealCost,
        member.extraBillsTotal,
        member.deposit,
        member.total,
        member.due,
        member.balance,
      ]),
    ];

    const csv = rows
      .map((row) => row.map(csvValue).join(","))
      .join("\n");
    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `monthly-report-${selectedReport.month}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Archive CSV exported");
  };

  const reportTotals = selectedReport?.totals || {};
  const reportMembers = selectedReport?.memberSummaries || [];
  const sourceCounts = selectedReport?.sourceCounts || {};

  const columns = [
    {
      key: "name",
      label: "Member",
      render: (value) => (
        <span className="font-bold theme-text">{value}</span>
      ),
    },
    {
      key: "meals",
      label: "Meals",
      render: (value) => normalizeNumber(value).toFixed(1),
    },
    {
      key: "mealCost",
      label: "Meal Cost",
      render: (value) => formatCurrency(value, currency),
    },
    {
      key: "extraBillsTotal",
      label: "Extra",
      render: (value) => formatCurrency(value, currency),
    },
    {
      key: "deposit",
      label: "Deposit",
      render: (value) => formatCurrency(value, currency),
    },
    {
      key: "total",
      label: "Total",
      render: (value) => formatCurrency(value, currency),
    },
    {
      key: "due",
      label: "Due",
      render: (value) => (
        <span
          className={
            normalizeNumber(value) > 0
              ? "font-bold text-red-500"
              : "font-bold text-green-500"
          }
        >
          {formatCurrency(value, currency)}
        </span>
      ),
    },
  ];

  return (
    <PageWrapper>
      <SmartHero
        eyebrow="Monthly Archive"
        title="Archive"
        subtitle="Closing a month creates an archived report snapshot. It does not delete, move, or reset current records."
        metrics={[
          {
            label: "Archived Months",
            value: reports.length,
            caption: "saved snapshots",
          },
          {
            label: "Active Month",
            value: settings?.activeMonth || defaultMonth,
            caption: "foundation only",
          },
          {
            label: "Last Closed",
            value: settings?.lastClosedMonth || "None",
            caption: "from workspace settings",
          },
          {
            label: "Live Due",
            value: formatCurrency(billData.totalDue || 0, currency),
            caption: "current calculation",
          },
        ]}
        actions={
          canClose ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                type="month"
                value={closeMonth}
                onChange={(event) => setCloseMonthInput(event.target.value)}
                wrapperClass="sm:w-40"
                aria-label="Close month"
              />
              <Button
                onClick={() => closeSnapshot()}
                loading={closing}
              >
                <CalendarCheck size={16} />
                Close Month
              </Button>
            </div>
          ) : null
        }
      />

      <Card className="mb-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
            <Lock size={18} />
          </div>
          <div>
            <p className="text-sm font-black theme-text">
              Data safety guarantee
            </p>
            <p className="mt-1 text-sm theme-subtext">
              Closing a month creates an archived report snapshot. It does not delete, move, or reset current records.
            </p>
          </div>
        </div>
      </Card>

      {reports.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[280px_1fr]">
          <Card>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black theme-text">
                  Saved Months
                </p>
                <p className="text-xs theme-muted-text">
                  Snapshot history
                </p>
              </div>
              <Badge variant="purple">{reports.length}</Badge>
            </div>

            <Select
              value={selectedReport?.month || ""}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="mb-4"
            >
              {reports.map((report) => (
                <option key={report.month} value={report.month}>
                  {getMonthLabel(report.month)}
                </option>
              ))}
            </Select>

            <div className="space-y-2">
              {reports.map((report) => (
                <button
                  type="button"
                  key={report.month}
                  onClick={() => setSelectedMonth(report.month)}
                  className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${
                    selectedReport?.month === report.month
                      ? "theme-accent-bg text-white"
                      : "theme-muted hover:bg-[var(--bg-card-muted)]"
                  }`}
                >
                  <p className="text-sm font-bold">
                    {getMonthLabel(report.month)}
                  </p>
                  <p
                    className={
                      selectedReport?.month === report.month
                        ? "text-xs text-white/75"
                        : "text-xs theme-muted-text"
                    }
                  >
                    Closed {formatTimestamp(report.closedAt)}
                  </p>
                </button>
              ))}
            </div>
          </Card>

          <div className="space-y-6">
            <SmartSection
              title={getMonthLabel(selectedReport?.month)}
              subtitle={`Closed by ${selectedReport?.metadata?.closedByName || "Workspace user"} · ${formatTimestamp(selectedReport?.closedAt)}`}
              actions={
                <Button
                  variant="secondary"
                  onClick={exportArchiveCSV}
                >
                  <Download size={16} />
                  Export CSV
                </Button>
              }
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  label="Meals"
                  value={normalizeNumber(reportTotals.totalMeals).toFixed(1)}
                  caption={`${sourceCounts.meals || 0} meal records`}
                  icon={UtensilsCrossed}
                  tone="blue"
                />
                <MetricCard
                  label="Bazaar"
                  value={formatCurrency(reportTotals.totalBazaar, currency)}
                  caption={`${sourceCounts.bazaar || 0} expense records`}
                  icon={Archive}
                  tone="orange"
                />
                <MetricCard
                  label="Deposits"
                  value={formatCurrency(reportTotals.totalDeposits, currency)}
                  caption={`${sourceCounts.deposits || 0} deposit records`}
                  icon={Wallet}
                  tone="green"
                />
                <MetricCard
                  label="Due"
                  value={formatCurrency(reportTotals.totalDue, currency)}
                  caption={`${reportMembers.length} member summaries`}
                  icon={Users}
                  tone="red"
                />
              </div>
            </SmartSection>

            <Card noPad>
              <Table
                columns={columns}
                data={reportMembers}
                emptyState={
                  <div className="p-12">
                    <EmptyState
                      icon={FileText}
                      title="No member summaries"
                      description="This archived report does not include member summary rows."
                    />
                  </div>
                }
              />
            </Card>
          </div>
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={Archive}
            title="No archived months yet"
            description="Close a month to save the current live report as a historical snapshot."
            action={
              canClose ? (
                <Button
                  onClick={() => closeSnapshot()}
                  loading={closing}
                >
                  <CalendarCheck size={16} />
                  Close First Month
                </Button>
              ) : null
            }
          />
        </Card>
      )}

      <Modal
        open={confirmOverwrite}
        onClose={() => setConfirmOverwrite(false)}
        title="Replace Archived Snapshot?"
        subtitle={`${getMonthLabel(closeMonth)} already has a saved monthly report.`}
      >
        <div className="space-y-4">
          <p className="text-sm theme-subtext">
            Re-closing will replace the archived snapshot for this month. Original meals, deposits, bazaar records, and extra bills will still remain unchanged.
          </p>
          <div className="flex gap-3">
            <Button
              variant="danger"
              loading={closing}
              onClick={() => closeSnapshot({ overwrite: true })}
            >
              <RefreshCw size={16} />
              Replace Snapshot
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setConfirmOverwrite(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
}

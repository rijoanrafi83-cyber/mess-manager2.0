import { useMemo } from "react";
import { motion } from "framer-motion";

import {
  FileText,
  Download,
  TrendingDown,
  Wallet,
  Users,
  UtensilsCrossed,
  AlertCircle,
  CheckCircle,
  Printer,
} from "lucide-react";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import {
  PageWrapper,
  PageHeader,
  Card,
  CardHeader,
  Button,
  Badge,
  Table,
  StatCard,
} from "../components/ui";

import { formatCurrency } from "../utils/billing";

export default function ReportsPage({
  billData = {},
  members = [],
  meals = [],
  bazaar = [],
  deposits = [],
  settings,
}) {
  const {
    memberBills = [],
    totalBazaar = 0,
    grandExpense = 0,
    totalMeals = 0,
    totalDeposits = 0,
    totalDue = 0,
    mealRate = 0,
  } = billData;

  const currency = settings?.currency || "৳";

  const month = new Date().toLocaleString(
    "default",
    {
      month: "long",
      year: "numeric",
    }
  );

  const paidMembers =
    memberBills.filter((m) => m.due <= 0)
      .length;

  const dueMembers =
    memberBills.filter((m) => m.due > 0)
      .length;

  const sortedByDue = useMemo(
    () =>
      [...memberBills].sort(
        (a, b) => b.due - a.due
      ),
    [memberBills]
  );

  // PDF DOWNLOAD

  const handlePDFDownload = () => {
    const doc = new jsPDF();

    doc.setFontSize(24);

    doc.text(
      "Mess Monthly Report",
      14,
      20
    );

    doc.setFontSize(12);

    doc.text(`Month: ${month}`, 14, 32);

    doc.text(
      `Generated: ${new Date().toLocaleString()}`,
      14,
      40
    );

    doc.setFontSize(14);

    doc.text(
      `Total Members: ${members.length}`,
      14,
      55
    );

    doc.text(
      `Total Meals: ${totalMeals.toFixed(
        1
      )}`,
      14,
      63
    );

    doc.text(
      `Meal Rate: ${formatCurrency(
        mealRate.toFixed(2),
        currency
      )}`,
      14,
      71
    );

    doc.text(
      `Total Bazaar: ${formatCurrency(
        totalBazaar,
        currency
      )}`,
      14,
      79
    );

    doc.text(
      `Total Deposits: ${formatCurrency(
        totalDeposits,
        currency
      )}`,
      14,
      87
    );

    doc.text(
      `Total Due: ${formatCurrency(
        totalDue,
        currency
      )}`,
      14,
      95
    );

    autoTable(doc, {
      startY: 110,

      head: [
        [
          "Member",
          "Meals",
          "Meal Cost",
          "Deposit",
          "Total",
          "Due",
        ],
      ],

      body: memberBills.map((m) => [
        m.name,
        m.meals?.toFixed(1),
        formatCurrency(
          m.mealCost?.toFixed(2),
          currency
        ),
        formatCurrency(
          m.deposit?.toFixed(2),
          currency
        ),
        formatCurrency(
          m.total?.toFixed(2),
          currency
        ),
        formatCurrency(
          m.due?.toFixed(2),
          currency
        ),
      ]),
    });

    doc.save(
      `mess-report-${month}.pdf`
    );
  };

  // PRINT

  const handlePrint = () => {
    window.print();
  };

  // CSV

  const handleCSVExport = () => {
    const rows = [
      [
        "Name",
        "Meals",
        "Meal Cost",
        "Deposit",
        "Total Bill",
        "Due",
      ],

      ...memberBills.map((m) => [
        m.name,
        m.meals.toFixed(1),
        m.mealCost.toFixed(2),
        m.deposit.toFixed(2),
        m.total.toFixed(2),
        m.due.toFixed(2),
      ]),
    ];

    const csv = rows
      .map((r) => r.join(","))
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv",
    });

    const url =
      URL.createObjectURL(blob);

    const a =
      document.createElement("a");

    a.href = url;

    a.download = `member-bills.csv`;

    a.click();

    URL.revokeObjectURL(url);
  };

  const tableColumns = [
    {
      key: "name",
      label: "Member",
    },

    {
      key: "meals",
      label: "Meals",
      render: (v) => v?.toFixed(1),
    },

    {
      key: "mealCost",
      label: "Meal Cost",
      render: (v) =>
        formatCurrency(
          v?.toFixed(2),
          currency
        ),
    },

    {
      key: "deposit",
      label: "Deposit",
      render: (v) =>
        formatCurrency(
          v?.toFixed(2),
          currency
        ),
    },

    {
      key: "total",
      label: "Total Bill",

      render: (v) => (
        <span className="font-semibold">
          {formatCurrency(
            v?.toFixed(2),
            currency
          )}
        </span>
      ),
    },

    {
      key: "due",

      label: "Status",

      render: (v) => (
        <div>
          {v > 0 ? (
            <Badge variant="danger">
              Due:{" "}
              {formatCurrency(
                v?.toFixed(2),
                currency
              )}
            </Badge>
          ) : (
            <Badge variant="success">
              +
              {formatCurrency(
                Math.abs(v)?.toFixed(2),
                currency
              )}
            </Badge>
          )}
        </div>
      ),
    },
  ];

  return (
    <PageWrapper>

      <PageHeader
        title="Monthly Report"
        subtitle={month}
        actions={
          <div className="flex gap-2 flex-wrap">

            <Button
              variant="secondary"
              onClick={handleCSVExport}
            >
              <Download size={16} />
              CSV
            </Button>

            <Button
              onClick={handlePDFDownload}
            >
              <FileText size={16} />
              PDF
            </Button>

            <Button
              variant="secondary"
              onClick={handlePrint}
            >
              <Printer size={16} />
              Print
            </Button>
          </div>
        }
      />

      {/* SUMMARY */}

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">

        <StatCard
          label="Members"
          value={members.length}
          icon={Users}
          iconBg="bg-violet-500/10"
          iconColor="text-violet-500"
        />

        <StatCard
          label="Total Meals"
          value={totalMeals.toFixed(1)}
          icon={UtensilsCrossed}
          iconBg="bg-blue-500/10"
          iconColor="text-blue-500"
        />

        <StatCard
          label="Meal Rate"
          value={formatCurrency(
            mealRate.toFixed(2),
            currency
          )}
          icon={TrendingDown}
          iconBg="bg-orange-500/10"
          iconColor="text-orange-500"
        />

        <StatCard
          label="Total Bazaar"
          value={formatCurrency(
            totalBazaar,
            currency
          )}
          icon={Wallet}
          iconBg="bg-red-500/10"
          iconColor="text-red-500"
        />

        <StatCard
          label="Deposits"
          value={formatCurrency(
            totalDeposits,
            currency
          )}
          icon={Wallet}
          iconBg="bg-green-500/10"
          iconColor="text-green-500"
        />

        <StatCard
          label="Total Due"
          value={formatCurrency(
            totalDue,
            currency
          )}
          icon={AlertCircle}
          iconBg={
            totalDue > 0
              ? "bg-red-500/10"
              : "bg-green-500/10"
          }
          iconColor={
            totalDue > 0
              ? "text-red-500"
              : "text-green-500"
          }
        />
      </div>

      {/* PAYMENT STATUS */}

      <div className="grid grid-cols-2 gap-4 mb-6">

        <Card className="flex items-center gap-4">

          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
            <CheckCircle
              size={20}
              className="text-green-500"
            />
          </div>

          <div>
            <p className="text-2xl font-bold">
              {paidMembers}
            </p>

            <p className="text-sm text-gray-400">
              Settled
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">

          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
            <AlertCircle
              size={20}
              className="text-red-500"
            />
          </div>

          <div>
            <p className="text-2xl font-bold">
              {dueMembers}
            </p>

            <p className="text-sm text-gray-400">
              Members with Due
            </p>
          </div>
        </Card>
      </div>

      {/* TABLE */}

      <Card noPad className="mb-6">

        <div className="p-6 pb-0">

          <CardHeader
            title="Member Bills"
            subtitle={`Meal Rate: ${formatCurrency(
              mealRate.toFixed(2),
              currency
            )}`}
          />
        </div>

        <Table
          columns={tableColumns}
          data={sortedByDue}
        />
      </Card>

      {/* FORMULA */}

      <Card>

        <CardHeader title="Calculation Formula" />

        <div className="p-5 rounded-2xl bg-gray-100 dark:bg-white/5">

          <p className="font-mono text-sm">
            Member Bill = (Meals × Meal
            Rate) − Deposit
          </p>

          <p className="text-xs text-gray-500 mt-2">
            Breakfast = 0.5 unit · Lunch
            = 1 unit · Dinner = 1 unit
          </p>
        </div>
      </Card>
    </PageWrapper>
  );
}
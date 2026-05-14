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

  const month = new Date().toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  const paidMembers =
    memberBills.filter((m) => m.due <= 0).length;

  const dueMembers =
    memberBills.filter((m) => m.due > 0).length;

  const sortedByDue = useMemo(
    () =>
      [...memberBills].sort(
        (a, b) => b.due - a.due
      ),
    [memberBills]
  );

  // FULL PDF DOWNLOAD

  const handlePDFDownload = () => {
    const doc = new jsPDF();

    doc.setFontSize(24);

    doc.text("Mess Monthly Report", 14, 20);

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
      `Total Meals: ${totalMeals.toFixed(1)}`,
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

    doc.save(`mess-report-${month}.pdf`);
  };

  // FULL REPORT PRINT

  const handlePrint = () => {
    const printContent = `
      <html>
        <head>
          <title>Mess Monthly Report</title>

          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 30px;
              color: #111;
            }

            h1 {
              margin-bottom: 5px;
            }

            .sub {
              color: #666;
              margin-bottom: 30px;
            }

            .summary {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 16px;
              margin-bottom: 30px;
            }

            .card {
              border: 1px solid #ddd;
              border-radius: 10px;
              padding: 15px;
            }

            .label {
              font-size: 13px;
              color: #777;
              margin-bottom: 8px;
            }

            .value {
              font-size: 22px;
              font-weight: bold;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }

            th, td {
              border: 1px solid #ddd;
              padding: 10px;
              text-align: left;
            }

            th {
              background: #f5f5f5;
            }

            .footer {
              margin-top: 30px;
              font-size: 12px;
              color: #666;
            }
          </style>
        </head>

        <body>

          <h1>Monthly Report</h1>

          <p class="sub">${month}</p>

          <div class="summary">

            <div class="card">
              <div class="label">Members</div>
              <div class="value">${members.length}</div>
            </div>

            <div class="card">
              <div class="label">Total Meals</div>
              <div class="value">${totalMeals.toFixed(
                1
              )}</div>
            </div>

            <div class="card">
              <div class="label">Meal Rate</div>
              <div class="value">
                ${formatCurrency(
                  mealRate.toFixed(2),
                  currency
                )}
              </div>
            </div>

            <div class="card">
              <div class="label">Total Bazaar</div>
              <div class="value">
                ${formatCurrency(
                  totalBazaar,
                  currency
                )}
              </div>
            </div>

            <div class="card">
              <div class="label">Deposits</div>
              <div class="value">
                ${formatCurrency(
                  totalDeposits,
                  currency
                )}
              </div>
            </div>

            <div class="card">
              <div class="label">Total Due</div>
              <div class="value">
                ${formatCurrency(
                  totalDue,
                  currency
                )}
              </div>
            </div>

          </div>

          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Meals</th>
                <th>Meal Cost</th>
                <th>Deposit</th>
                <th>Total</th>
                <th>Due</th>
              </tr>
            </thead>

            <tbody>

              ${memberBills
                .map(
                  (m) => `
                  <tr>
                    <td>${m.name}</td>
                    <td>${m.meals.toFixed(
                      1
                    )}</td>
                    <td>${formatCurrency(
                      m.mealCost.toFixed(2),
                      currency
                    )}</td>
                    <td>${formatCurrency(
                      m.deposit.toFixed(2),
                      currency
                    )}</td>
                    <td>${formatCurrency(
                      m.total.toFixed(2),
                      currency
                    )}</td>
                    <td>${formatCurrency(
                      m.due.toFixed(2),
                      currency
                    )}</td>
                  </tr>
                `
                )
                .join("")}

            </tbody>
          </table>

          <div class="footer">
            Generated on ${new Date().toLocaleString()}
          </div>

        </body>
      </html>
    `;

    const printWindow = window.open(
      "",
      "_blank",
      "width=1000,height=700"
    );

    printWindow.document.write(printContent);

    printWindow.document.close();

    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  // INDIVIDUAL MEMBER PDF

  const handleMemberPDF = (member) => {
    const doc = new jsPDF();

    doc.setFontSize(24);

    doc.text(
      "Individual Member Report",
      20,
      20
    );

    doc.setFontSize(12);

    doc.text(
      `Generated: ${new Date().toLocaleString()}`,
      20,
      32
    );

    doc.setFontSize(16);

    doc.text(
      `Member Name: ${member.name}`,
      20,
      50
    );

    doc.text(
      `Month: ${month}`,
      20,
      62
    );

    doc.line(20, 70, 190, 70);

    doc.setFontSize(14);

    doc.text(
      `Total Meals: ${member.meals.toFixed(
        1
      )}`,
      20,
      90
    );

    doc.text(
      `Meal Cost: ${formatCurrency(
        member.mealCost.toFixed(2),
        currency
      )}`,
      20,
      105
    );

    doc.text(
      `Deposit: ${formatCurrency(
        member.deposit.toFixed(2),
        currency
      )}`,
      20,
      120
    );

    doc.text(
      `Total Bill: ${formatCurrency(
        member.total.toFixed(2),
        currency
      )}`,
      20,
      135
    );

    doc.text(
      `Due / Advance: ${formatCurrency(
        member.due.toFixed(2),
        currency
      )}`,
      20,
      150
    );

    doc.line(20, 165, 190, 165);

    doc.setFontSize(11);

    doc.text(
      "Meal Formula: (Meals × Meal Rate) − Deposit",
      20,
      180
    );

    doc.save(
      `${member.name}-report.pdf`
    );
  };

  // INDIVIDUAL MEMBER PRINT

  const handleMemberPrint = (member) => {
    const printContent = `
      <html>
        <head>
          <title>${member.name} Report</title>

          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 40px;
              color: #111;
            }

            h1 {
              margin-bottom: 10px;
            }

            .sub {
              color: #666;
              margin-bottom: 30px;
            }

            .card {
              border: 1px solid #ddd;
              border-radius: 10px;
              padding: 20px;
              margin-bottom: 15px;
            }

            .label {
              font-size: 14px;
              color: #666;
              margin-bottom: 6px;
            }

            .value {
              font-size: 24px;
              font-weight: bold;
            }

            .footer {
              margin-top: 40px;
              font-size: 12px;
              color: #777;
            }
          </style>
        </head>

        <body>

          <h1>Individual Member Report</h1>

          <p class="sub">${month}</p>

          <div class="card">
            <div class="label">Member Name</div>
            <div class="value">${member.name}</div>
          </div>

          <div class="card">
            <div class="label">Total Meals</div>
            <div class="value">
              ${member.meals.toFixed(1)}
            </div>
          </div>

          <div class="card">
            <div class="label">Meal Cost</div>
            <div class="value">
              ${formatCurrency(
                member.mealCost.toFixed(2),
                currency
              )}
            </div>
          </div>

          <div class="card">
            <div class="label">Deposit</div>
            <div class="value">
              ${formatCurrency(
                member.deposit.toFixed(2),
                currency
              )}
            </div>
          </div>

          <div class="card">
            <div class="label">Total Bill</div>
            <div class="value">
              ${formatCurrency(
                member.total.toFixed(2),
                currency
              )}
            </div>
          </div>

          <div class="card">
            <div class="label">Due / Advance</div>
            <div class="value">
              ${formatCurrency(
                member.due.toFixed(2),
                currency
              )}
            </div>
          </div>

          <div class="footer">
            Generated on ${new Date().toLocaleString()}
          </div>

        </body>
      </html>
    `;

    const printWindow = window.open(
      "",
      "_blank",
      "width=900,height=700"
    );

    printWindow.document.write(
      printContent
    );

    printWindow.document.close();

    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  // CSV EXPORT

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

    {
      key: "actions",
      label: "Actions",

      render: (_, row) => (
        <div className="flex gap-2">

          <Button
            size="sm"
            onClick={() =>
              handleMemberPDF(row)
            }
          >
            PDF
          </Button>

          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              handleMemberPrint(row)
            }
          >
            Print
          </Button>
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
          data={sortedByDue.map((m) => ({
            ...m,
            actions: m,
          }))}
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
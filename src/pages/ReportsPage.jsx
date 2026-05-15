import { useMemo, useRef } from "react";

import {
  motion
} from "framer-motion";

import {

  Download,
  Printer,
  FileText,
  Users,
  Wallet,
  ShoppingCart,
  AlertCircle,
  CheckCircle2,
  UtensilsCrossed

} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import html2canvas from "html2canvas";

import jsPDF from "jspdf";

import toast from "react-hot-toast";

import {

  PageWrapper,
  Card,
  Button,
  Badge,
  EmptyState

} from "../components/ui";
import {
  MetricCard,
  SmartHero,
  SmartSection,
} from "../components/SmartUI";

import {

  formatCurrency,
  getMealRateColor

} from "../utils/billing";
import { useChartTheme } from "../hooks/useChartTheme";



const PDF_SAFE_REPORT_CSS = `
  #report-summary,
  #report-summary * {
    color-scheme: light !important;
    animation: none !important;
    transition: none !important;
    box-shadow: none !important;
  }

  #report-summary {
    background: #ffffff !important;
    color: #111827 !important;
  }

  #report-summary [class*="bg-white"],
  #report-summary [class*="dark:bg-white"] {
    background: #ffffff !important;
  }

  #report-summary [class*="bg-gray-50"],
  #report-summary [class*="dark:bg-white/5"],
  #report-summary [class*="dark:hover:bg-white"] {
    background: #f9fafb !important;
  }

  #report-summary [class*="bg-gray-100"] {
    background: #f3f4f6 !important;
  }

  #report-summary [class*="bg-green-500/10"] {
    background: #ecfdf5 !important;
  }

  #report-summary [class*="bg-red-500/10"] {
    background: #fef2f2 !important;
  }

  #report-summary [class*="border-gray-100"],
  #report-summary [class*="dark:border-white"] {
    border-color: #f3f4f6 !important;
  }

  #report-summary [class*="border-gray-200"] {
    border-color: #e5e7eb !important;
  }

  #report-summary [class*="text-gray-900"],
  #report-summary [class*="dark:text-white"] {
    color: #111827 !important;
  }

  #report-summary [class*="text-gray-700"],
  #report-summary [class*="text-gray-600"] {
    color: #4b5563 !important;
  }

  #report-summary [class*="text-gray-500"],
  #report-summary [class*="dark:text-gray-400"] {
    color: #6b7280 !important;
  }

  #report-summary [class*="text-violet-500"],
  #report-summary [class*="text-violet-600"] {
    color: #8b5cf6 !important;
  }

  #report-summary [class*="text-blue-500"] {
    color: #3b82f6 !important;
  }

  #report-summary [class*="text-orange-500"] {
    color: #f97316 !important;
  }

  #report-summary [class*="text-green-500"],
  #report-summary [class*="text-green-600"],
  #report-summary [class*="dark:text-green-400"] {
    color: #22c55e !important;
  }

  #report-summary [class*="text-red-500"],
  #report-summary [class*="text-red-600"] {
    color: #ef4444 !important;
  }

  #report-summary button {
    background: #f3f4f6 !important;
    color: #374151 !important;
    border-color: #e5e7eb !important;
  }
`;



const getPdfSafeTextColor = (
  className
) => {

  if (
    className.includes(
      "text-violet"
    ) ||
    className.includes(
      "text-purple"
    )
  ) {

    return "#8b5cf6";
  }

  if (
    className.includes(
      "text-blue"
    )
  ) {

    return "#3b82f6";
  }

  if (
    className.includes(
      "text-orange"
    )
  ) {

    return "#f97316";
  }

  if (
    className.includes(
      "text-green"
    )
  ) {

    return "#16a34a";
  }

  if (
    className.includes(
      "text-red"
    ) ||
    className.includes(
      "text-rose"
    )
  ) {

    return "#dc2626";
  }

  if (
    className.includes(
      "text-yellow"
    )
  ) {

    return "#a16207";
  }

  if (
    className.includes(
      "text-gray-400"
    ) ||
    className.includes(
      "text-gray-500"
    ) ||
    className.includes(
      "dark:text-gray-400"
    )
  ) {

    return "#6b7280";
  }

  if (
    className.includes(
      "text-gray-600"
    ) ||
    className.includes(
      "text-gray-700"
    ) ||
    className.includes(
      "dark:text-gray-300"
    )
  ) {

    return "#4b5563";
  }

  return "#111827";
};



const getPdfSafeBackgroundColor = (
  className,
  tagName
) => {

  if (
    tagName === "TH"
  ) {

    return "#f9fafb";
  }

  if (
    className.includes(
      "bg-green"
    )
  ) {

    return "#dcfce7";
  }

  if (
    className.includes(
      "bg-red"
    ) ||
    className.includes(
      "bg-rose"
    )
  ) {

    return "#fee2e2";
  }

  if (
    className.includes(
      "bg-yellow"
    )
  ) {

    return "#fef9c3";
  }

  if (
    className.includes(
      "bg-blue"
    )
  ) {

    return "#dbeafe";
  }

  if (
    className.includes(
      "bg-violet"
    ) ||
    className.includes(
      "bg-purple"
    )
  ) {

    return "#ede9fe";
  }

  if (
    className.includes(
      "bg-orange"
    )
  ) {

    return "#ffedd5";
  }

  if (
    className.includes(
      "bg-gray-50"
    ) ||
    className.includes(
      "dark:bg-white/5"
    ) ||
    className.includes(
      "dark:bg-white/8"
    ) ||
    className.includes(
      "bg-white/5"
    ) ||
    className.includes(
      "bg-white/8"
    )
  ) {

    return "#f9fafb";
  }

  if (
    className.includes(
      "bg-gray-100"
    ) ||
    className.includes(
      "bg-gray-200"
    )
  ) {

    return "#f3f4f6";
  }

  if (
    className.includes(
      "bg-white"
    ) ||
    className.includes(
      "dark:bg-white"
    )
  ) {

    return "#ffffff";
  }

  return "transparent";
};



const applyPdfSafeInlineColors = (
  clonedReport
) => {

  const elements = [
    clonedReport,
    ...clonedReport.querySelectorAll(
      "*"
    ),
  ];

  elements.forEach(
    (element) => {

      const className =
        typeof element.className ===
        "string"
          ? element.className
          : "";

      const tagName =
        element.tagName;

      const color =
        getPdfSafeTextColor(
          className
        );

      const backgroundColor =
        getPdfSafeBackgroundColor(
          className,
          tagName
        );

      element.style.setProperty(
        "color",
        color,
        "important"
      );

      element.style.setProperty(
        "background-color",
        backgroundColor,
        "important"
      );

      [
        "border-color",
        "border-top-color",
        "border-right-color",
        "border-bottom-color",
        "border-left-color",
        "outline-color",
        "text-decoration-color",
        "-webkit-text-stroke-color",
        "caret-color",
      ].forEach((property) => {

        element.style.setProperty(
          property,
          "#e5e7eb",
          "important"
        );
      });

      element.style.setProperty(
        "box-shadow",
        "none",
        "important"
      );

      if (
        element.namespaceURI ===
        "http://www.w3.org/2000/svg"
      ) {

        element.style.setProperty(
          "stroke",
          color,
          "important"
        );

        element.setAttribute(
          "stroke",
          color
        );

        if (
          element.getAttribute(
            "fill"
          ) !== "none"
        ) {

          element.style.setProperty(
            "fill",
            color,
            "important"
          );
        }
      }
    }
  );
};

const waitForPaint = () =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(resolve);
    });
  });

const safeCssColor = (
  value,
  fallback = "#111827"
) => {
  if (
    !value ||
    value === "transparent" ||
    value.includes("oklch") ||
    value.includes("color-mix") ||
    value.includes("var(")
  ) {
    return fallback;
  }

  return value;
};

const copyPdfSafeStyles = (
  source,
  target
) => {
  const computed =
    window.getComputedStyle(source);
  const className =
    typeof source.className === "string"
      ? source.className
      : "";
  const tagName = source.tagName;
  const textColor =
    getPdfSafeTextColor(className);
  const backgroundColor =
    getPdfSafeBackgroundColor(
      className,
      tagName
    );

  [
    "display",
    "boxSizing",
    "width",
    "minWidth",
    "maxWidth",
    "height",
    "minHeight",
    "padding",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "margin",
    "marginTop",
    "marginRight",
    "marginBottom",
    "marginLeft",
    "gap",
    "columnGap",
    "rowGap",
    "gridTemplateColumns",
    "gridTemplateRows",
    "alignItems",
    "justifyContent",
    "flexDirection",
    "flexWrap",
    "font",
    "fontSize",
    "fontWeight",
    "lineHeight",
    "letterSpacing",
    "textAlign",
    "textTransform",
    "borderRadius",
    "borderWidth",
    "borderStyle",
    "overflow",
    "whiteSpace",
    "tableLayout",
    "verticalAlign",
  ].forEach((property) => {
    target.style[property] =
      computed[property];
  });

  target.style.color =
    safeCssColor(
      textColor || computed.color
    );
  target.style.backgroundColor =
    backgroundColor === "transparent"
      ? safeCssColor(
          computed.backgroundColor,
          "transparent"
        )
      : backgroundColor;
  target.style.backgroundImage = "none";
  target.style.boxShadow = "none";
  target.style.textShadow = "none";
  target.style.filter = "none";
  target.style.backdropFilter = "none";
  target.style.webkitBackdropFilter = "none";
  target.style.transform = "none";
  target.style.animation = "none";
  target.style.transition = "none";
  target.style.borderColor = "#e5e7eb";

  if (
    target instanceof HTMLElement
  ) {
    target.className = "";
  }

  if (
    target.namespaceURI ===
    "http://www.w3.org/2000/svg"
  ) {
    target.style.background = "transparent";
  }
};

const createPdfExportClone = (
  reportElement
) => {
  const wrapper =
    document.createElement("div");
  const clone =
    reportElement.cloneNode(true);
  const sourceElements = [
    reportElement,
    ...reportElement.querySelectorAll("*"),
  ];
  const cloneElements = [
    clone,
    ...clone.querySelectorAll("*"),
  ];
  const width = Math.max(
    900,
    reportElement.scrollWidth,
    reportElement.getBoundingClientRect().width
  );

  wrapper.setAttribute(
    "data-pdf-export-root",
    "true"
  );
  wrapper.style.position = "fixed";
  wrapper.style.left = "-100000px";
  wrapper.style.top = "0";
  wrapper.style.width = `${width}px`;
  wrapper.style.background = "#ffffff";
  wrapper.style.color = "#111827";
  wrapper.style.zIndex = "-1";
  wrapper.style.pointerEvents = "none";
  wrapper.style.overflow = "visible";

  clone.id = "report-summary-export";
  clone.style.width = `${width}px`;
  clone.style.maxWidth = `${width}px`;
  clone.style.background = "#ffffff";
  clone.style.color = "#111827";
  clone.style.padding = "0";

  sourceElements.forEach(
    (source, index) => {
      const target =
        cloneElements[index];

      if (!target) return;

      copyPdfSafeStyles(
        source,
        target
      );
    }
  );

  clone
    .querySelectorAll("button")
    .forEach((button) => {
      button.remove();
    });

  clone
    .querySelectorAll("svg")
    .forEach((svg) => {
      svg.style.background =
        "transparent";
      svg.removeAttribute("filter");
    });

  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  return {
    wrapper,
    clone,
  };
};



/* =========================================================
   MEMBER PDF EXPORT
========================================================= */

async function exportMemberPDF(
  member,
  currency
) {

  const doc =
    new jsPDF();

  doc.setFontSize(20);

  doc.text(
    "Mess Monthly Report",
    20,
    20
  );

  doc.setFontSize(12);

  doc.text(
    `Member: ${member.name}`,
    20,
    40
  );

  doc.text(
    `Meals: ${member.meals.toFixed(
      1
    )}`,
    20,
    55
  );

  doc.text(
    `Meal Cost: ${formatCurrency(
      member.mealCost,
      currency
    )}`,
    20,
    70
  );

  doc.text(
    `Deposit: ${formatCurrency(
      member.deposit,
      currency
    )}`,
    20,
    85
  );

  doc.text(
    `Due: ${formatCurrency(
      member.due,
      currency
    )}`,
    20,
    100
  );

  doc.save(
    `${member.name}-report.pdf`
  );
}



/* =========================================================
   MAIN PAGE
========================================================= */

export default function ReportsPage({

  billData = {},

  members = [],

  settings,

}) {

  const reportRef =
    useRef(null);

  const currency =
    settings?.currency ||
    "৳";

  const chartTheme = useChartTheme();



  const {

    memberBills = [],

    totalMeals = 0,

    totalBazaar = 0,

    totalDeposits = 0,

    totalDue = 0,

    mealRate = 0,

  } = billData;



  /* =====================================================
     CSV EXPORT
  ===================================================== */

  const exportCSV = () => {

    try {

      const headers = [

        "Member",

        "Meals",

        "Meal Cost",

        "Deposit",

        "Total Bill",

        "Due"

      ];



      const rows =
        memberBills.map((m) => [

          m.name,

          m.meals,

          m.mealCost,

          m.deposit,

          m.total,

          m.due
        ]);



      const csv = [

        headers.join(","),

        ...rows.map((r) =>
          r.join(",")
        )

      ].join("\n");



      const blob = new Blob(
        [csv],
        {
          type:
            "text/csv;charset=utf-8;"
        }
      );



      const url =
        URL.createObjectURL(
          blob
        );



      const link =
        document.createElement(
          "a"
        );

      link.href = url;

      link.download =
        "monthly-report.csv";

      link.click();



      toast.success(
        "CSV exported!"
      );

    } catch (err) {

      console.error(err);

      toast.error(
        "Export failed"
      );
    }
  };



  /* =====================================================
     FULL PDF EXPORT
  ===================================================== */

  const exportPDF =
    async () => {
      let exportWrapper = null;

      try {

        const reportElement =
          reportRef.current ||
          document.getElementById(
            "report-summary"
          );

        if (
          !reportElement
        ) {

          throw new Error(
            "Report summary section was not found."
          );
        }

        toast.loading(
          "Generating PDF...",
          {
            id: "pdf"
          }
        );


        if (
          document.fonts?.ready
        ) {

          await document.fonts.ready;
        }

        await waitForPaint();

        const {
          wrapper,
          clone,
        } = createPdfExportClone(
          reportElement
        );
        exportWrapper = wrapper;

        const canvas =
          await html2canvas(
            clone,
            {
              scale:
                window.innerWidth < 768
                  ? 1.25
                  : Math.min(
                      1.6,
                      window.devicePixelRatio ||
                        1
                    ),

              backgroundColor:
                "#ffffff",

              useCORS: true,

              allowTaint: false,

              logging: false,

              scrollX: 0,

              scrollY: 0,

              windowWidth:
                clone.scrollWidth,

              windowHeight:
                clone.scrollHeight,

              foreignObjectRendering:
                false,

              imageTimeout:
                15000,

              onclone: (
                clonedDocument
              ) => {

                clonedDocument.documentElement.classList.remove(
                  "dark"
                );

                clonedDocument.body.style.background =
                  "#ffffff";

                clonedDocument.body.style.color =
                  "#111827";

                const style =
                  clonedDocument.createElement(
                    "style"
                  );

                style.textContent =
                  PDF_SAFE_REPORT_CSS;

                clonedDocument.head.appendChild(
                  style
                );

                const clonedReport =
                  clonedDocument.getElementById(
                    "report-summary-export"
                  );

                if (
                  clonedReport
                ) {

                  clonedReport.style.background =
                    "#ffffff";

                  clonedReport.style.color =
                    "#111827";

                  clonedReport.style.width =
                    `${clone.scrollWidth}px`;

                  clonedReport.style.minHeight =
                    `${clone.scrollHeight}px`;
                }
              },
            }
          );

        exportWrapper?.remove();
        exportWrapper = null;

        if (
          !canvas.width ||
          !canvas.height
        ) {

          throw new Error(
            "Report summary rendered as an empty canvas."
          );
        }



        const img =
          canvas.toDataURL(
            "image/png"
          );



        const pdf =
          new jsPDF(
            "p",
            "mm",
            "a4"
          );



        const pageWidth =
          pdf.internal.pageSize.getWidth();

        const pageHeight =
          pdf.internal.pageSize.getHeight();

        const margin = 10;

        const imgWidth =
          pageWidth -
          margin * 2;

        const imgHeight =
          (canvas.height *
            imgWidth) /
          canvas.width;

        let heightLeft =
          imgHeight;

        let position =
          margin;


        pdf.addImage(
          img,
          "PNG",
          margin,
          position,
          imgWidth,
          imgHeight
        );

        heightLeft -=
          pageHeight -
          margin * 2;

        while (
          heightLeft > 0
        ) {

          position =
            heightLeft -
            imgHeight +
            margin;

          pdf.addPage();

          pdf.addImage(
            img,
            "PNG",
            margin,
            position,
            imgWidth,
            imgHeight
          );

          heightLeft -=
            pageHeight -
            margin * 2;
        }



        pdf.save(
          "monthly-report.pdf"
        );



        toast.success(
          "PDF downloaded!",
          {
            id: "pdf"
          }
        );

      } catch (err) {

        console.error(err);

        toast.error(
          "PDF export failed",
          {
            id: "pdf"
          }
        );
      } finally {
        exportWrapper?.remove();
      }
    };



  /* =====================================================
     PRINT
  ===================================================== */

  const handlePrint = () => {

    const printContent =
      reportRef.current;

    const WinPrint =
      window.open(
        "",
        "",
        "width=1200,height=900"
      );



    WinPrint.document.write(`

      <html>

        <head>

          <title>Monthly Report</title>

          <style>

            body{
              font-family:Arial;
              padding:20px;
              background:white;
              color:black;
            }

            table{
              width:100%;
              border-collapse:collapse;
            }

            th,td{
              border:1px solid #ddd;
              padding:10px;
              text-align:left;
            }

            th{
              background:#f5f5f5;
            }

          </style>

        </head>

        <body>

          ${printContent.innerHTML}

        </body>

      </html>
    `);

    WinPrint.document.close();

    WinPrint.focus();

    WinPrint.print();

    WinPrint.close();
  };



  /* =====================================================
     SUMMARY
  ===================================================== */

  const settledMembers =
    memberBills.filter(
      (m) => m.due <= 0
    ).length;



  const dueMembers =
    memberBills.filter(
      (m) => m.due > 0
    ).length;



  const topMember =
    [...memberBills].sort(
      (a, b) =>
        b.meals -
        a.meals
    )[0];



  const currentMonth =
    new Date().toLocaleString(
      "default",
      {
        month: "long",
        year: "numeric",
      }
    );

  const reportChartData =
    useMemo(
      () =>
        memberBills
          .slice()
          .sort((a, b) => b.total - a.total)
          .slice(0, 8)
          .map((member) => ({
            name: member.name,
            bill: Number(member.total || 0),
            deposit: Number(member.deposit || 0),
            due: Math.max(0, Number(member.due || 0)),
          })),
      [memberBills]
    );



  const stats = [

    {
      label: "Members",
      value: members.length,
      icon: Users,
      color:
        "text-violet-500",
    },

    {
      label: "Total Meals",
      value:
        totalMeals.toFixed(
          1
        ),
      icon: UtensilsCrossed,
      color:
        "text-blue-500",
    },

    {
      label: "Meal Rate",
      value:
        formatCurrency(
          mealRate,
          currency
        ),
      icon: Wallet,
      color:
        getMealRateColor(
          mealRate
        ),
    },

    {
      label: "Total Bazaar",
      value:
        formatCurrency(
          totalBazaar,
          currency
        ),
      icon: ShoppingCart,
      color:
        "text-orange-500",
    },

    {
      label: "Deposits",
      value:
        formatCurrency(
          totalDeposits,
          currency
        ),
      icon: Wallet,
      color:
        "text-green-500",
    },

    {
      label: "Total Due",
      value:
        formatCurrency(
          totalDue,
          currency
        ),
      icon: AlertCircle,
      color:
        totalDue > 0
          ? "text-red-500"
          : "text-green-500",
    },
  ];



  return (

    <PageWrapper>

      <SmartHero
        eyebrow="Clean Reporting & Export"
        title="Monthly Report"
        subtitle={`${currentMonth} settlement intelligence with export-safe PDF, CSV, and print workflows.`}
        metrics={[
          { label: "Members", value: members.length, caption: `${settledMembers} settled` },
          { label: "Meal Rate", value: formatCurrency(mealRate, currency), caption: "per unit" },
          { label: "Deposits", value: formatCurrency(totalDeposits, currency), caption: "collected" },
          { label: "Due", value: formatCurrency(totalDue, currency), caption: `${dueMembers} members` },
        ]}

        actions={

          <div className="flex gap-2">

            <Button
              variant="secondary"
              onClick={
                exportCSV
              }
            >
              <Download size={16} />
              CSV
            </Button>



            <Button
              onClick={
                exportPDF
              }
            >
              <FileText size={16} />
              PDF
            </Button>



            <Button
              variant="secondary"
              onClick={
                handlePrint
              }
            >
              <Printer size={16} />
              Print
            </Button>

          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <MetricCard label="Settled Members" value={settledMembers} caption="no open dues" icon={CheckCircle2} tone="green" />
        <MetricCard label="Due Members" value={dueMembers} caption="requires follow-up" icon={AlertCircle} tone={dueMembers ? "red" : "green"} />
        <MetricCard label="Top Eater" value={topMember?.name || "No data"} caption={topMember ? `${topMember.meals.toFixed(1)} units` : "add meals to rank"} icon={UtensilsCrossed} tone="blue" />
      </div>

      {reportChartData.length > 0 && (
        <SmartSection title="Member Settlement Comparison" subtitle="Bill, deposit, and due by top members" className="mb-6">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={reportChartData} barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
              <XAxis dataKey="name" tick={{ fill: chartTheme.axis, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: chartTheme.axis, fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(value, name) => [formatCurrency(value, currency), name]}
                contentStyle={{
                  background: chartTheme.tooltip.background,
                  border: `1px solid ${chartTheme.tooltip.border}`,
                  borderRadius: 12,
                  color: chartTheme.tooltip.color,
                }}
                labelStyle={{ color: chartTheme.tooltip.color }}
              />
              <Bar dataKey="bill" name="Bill" fill={chartTheme.colors[0]} radius={[6, 6, 0, 0]} />
              <Bar dataKey="deposit" name="Deposit" fill={chartTheme.colors[2]} radius={[6, 6, 0, 0]} />
              <Bar dataKey="due" name="Due" fill={chartTheme.colors[4]} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </SmartSection>
      )}



      <div
        id="report-summary"
        ref={reportRef}
        className="space-y-6"
      >

        {/* =====================================
            STATS
        ===================================== */}

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">

          {stats.map(
            (
              stat,
              idx
            ) => (

              <motion.div
                key={stat.label}

                initial={{
                  opacity: 0,
                  y: 15,
                }}

                animate={{
                  opacity: 1,
                  y: 0,
                }}

                transition={{
                  delay:
                    idx * 0.05,
                }}
              >

                <Card>

                  <div className="flex items-start justify-between">

                    <div>

                      <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold">

                        {stat.label}

                      </p>

                      <h3
                        className={`mt-2 text-3xl font-black ${stat.color}`}
                      >

                        {stat.value}

                      </h3>

                    </div>



                    <div className="w-11 h-11 rounded-2xl bg-white/5 flex items-center justify-center">

                      <stat.icon
                        size={20}
                        className={
                          stat.color
                        }
                      />

                    </div>

                  </div>

                </Card>

              </motion.div>
            )
          )}

        </div>



        {/* =====================================
            SUMMARY CARDS
        ===================================== */}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          <Card>

            <div className="flex items-center gap-4">

              <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">

                <CheckCircle2
                  size={24}
                  className="text-green-500"
                />

              </div>



              <div>

                <h3 className="text-4xl font-black text-green-500">

                  {
                    settledMembers
                  }

                </h3>

                <p className="text-gray-500 dark:text-gray-400">

                  Settled

                </p>

              </div>

            </div>

          </Card>



          <Card>

            <div className="flex items-center gap-4">

              <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center">

                <AlertCircle
                  size={24}
                  className="text-red-500"
                />

              </div>



              <div>

                <h3 className="text-4xl font-black text-red-500">

                  {dueMembers}

                </h3>

                <p className="text-gray-500 dark:text-gray-400">

                  Members with Due

                </p>

              </div>

            </div>

          </Card>

        </div>



        {/* =====================================
            MEMBER BILLS
        ===================================== */}

        <Card noPad>

          <div className="p-6 border-b border-gray-100 dark:border-white/5">

            <h3 className="text-lg font-bold text-gray-900 dark:text-white">

              Member Bills

            </h3>

            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">

              Meal Rate:
              {" "}
              <span
                className={getMealRateColor(
                  mealRate
                )}
              >

                {formatCurrency(
                  mealRate,
                  currency
                )}

              </span>

            </p>

          </div>



          {memberBills.length >
          0 ? (

            <div className="overflow-x-auto">

              <table className="w-full">

                <thead>

                  <tr className="border-b border-gray-100 dark:border-white/5">

                    {[
                      "Member",
                      "Meals",
                      "Meal Cost",
                      "Deposit",
                      "Total Bill",
                      "Status",
                      "Actions",
                    ].map((h) => (

                      <th
                        key={h}
                        className="px-6 py-4 text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold"
                      >
                        {h}
                      </th>
                    ))}

                  </tr>

                </thead>



                <tbody>

                  {memberBills.map(
                    (member) => (

                      <tr
                        key={member.id}
                        className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
                      >

                        <td className="px-6 py-4">

                          <div>

                            <p className="font-semibold text-gray-900 dark:text-white">

                              {
                                member.name
                              }

                            </p>

                            {topMember?.id ===
                              member.id && (

                              <Badge variant="purple">

                                Top Eater

                              </Badge>
                            )}

                          </div>

                        </td>



                        <td className="px-6 py-4 font-semibold">

                          {member.meals.toFixed(
                            1
                          )}

                        </td>



                        <td className="px-6 py-4">

                          {formatCurrency(
                            member.mealCost,
                            currency
                          )}

                        </td>



                        <td className="px-6 py-4">

                          {formatCurrency(
                            member.deposit,
                            currency
                          )}

                        </td>



                        <td className="px-6 py-4 font-bold">

                          {formatCurrency(
                            member.total,
                            currency
                          )}

                        </td>



                        <td className="px-6 py-4">

                          {member.due >
                          0 ? (

                            <Badge variant="danger">

                              Due{" "}
                              {formatCurrency(
                                member.due,
                                currency
                              )}

                            </Badge>

                          ) : (

                            <Badge variant="success">

                              +
                              {formatCurrency(
                                member.balance,
                                currency
                              )}

                            </Badge>
                          )}

                        </td>



                        <td className="px-6 py-4">

                          <div className="flex gap-2">

                            <Button
                              size="xs"
                              onClick={() =>
                                exportMemberPDF(
                                  member,
                                  currency
                                )
                              }
                            >
                              PDF
                            </Button>



                            <Button
                              size="xs"
                              variant="secondary"

                              onClick={() => {

                                const w =
                                  window.open(
                                    "",
                                    "",
                                    "width=700,height=800"
                                  );

                                w.document.write(`
                                  <html>
                                  <head>
                                    <title>${member.name} Report</title>
                                  </head>
                                  <body style="font-family:Arial;padding:20px;">
                                    <h2>${member.name}</h2>
                                    <p>Meals: ${member.meals.toFixed(
                                      1
                                    )}</p>
                                    <p>Meal Cost: ${formatCurrency(
                                      member.mealCost,
                                      currency
                                    )}</p>
                                    <p>Deposit: ${formatCurrency(
                                      member.deposit,
                                      currency
                                    )}</p>
                                    <p>Due: ${formatCurrency(
                                      member.due,
                                      currency
                                    )}</p>
                                  </body>
                                  </html>
                                `);

                                w.print();
                              }}
                            >
                              Print
                            </Button>

                          </div>

                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>

          ) : (

            <div className="p-12">

              <EmptyState
                icon={FileText}

                title="No report data"

                description="Add members and meals to generate reports"
              />

            </div>
          )}

        </Card>



        {/* =====================================
            FORMULA
        ===================================== */}

        <Card>

          <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">

            Calculation Formula

          </h3>



          <div className="space-y-3 text-sm">

            <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/5">

              <p className="font-semibold mb-1">
                Meal Rate
              </p>

              <p className="text-gray-600 dark:text-gray-400">

                (
                Total Bazaar +
                Extra Costs
                )
                ÷
                Total Meals

              </p>

            </div>



            <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/5">

              <p className="font-semibold mb-1">
                Individual Bill
              </p>

              <p className="text-gray-600 dark:text-gray-400">

                Member Meals ×
                Meal Rate

              </p>

            </div>



            <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/5">

              <p className="font-semibold mb-1">
                Due / Balance
              </p>

              <p className="text-gray-600 dark:text-gray-400">

                Deposit −
                Total Bill

              </p>

            </div>

          </div>

        </Card>

      </div>

    </PageWrapper>
  );
}

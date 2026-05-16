import {
  useEffect,
  useState,
} from "react";

import { motion } from "framer-motion";

import {
  Activity,
  BadgeCheck,
  BarChart3,
  CalendarClock,
  Download,
  Fingerprint,
  Gauge,
  Gem,
  GitBranch,
  Layers3,
  LockKeyhole,
  MonitorSmartphone,
  Palette,
  ReceiptText,
  Rocket,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCog,
  Users,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";

const fadeUp = {
  hidden: {
    opacity: 0,
    y: 22,
  },
  show: {
    opacity: 1,
    y: 0,
  },
};

const stagger = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const stats = [
  {
    label: "Core modules",
    value: 10,
    suffix: "+",
    icon: Layers3,
  },
  {
    label: "Access roles",
    value: 3,
    suffix: "",
    icon: UserCog,
  },
  {
    label: "Export formats",
    value: 2,
    suffix: "",
    icon: Download,
  },
  {
    label: "Responsive care",
    value: 100,
    suffix: "%",
    icon: MonitorSmartphone,
  },
];

const featureCards = [
  {
    title: "Smart Meal Tracking",
    icon: UtensilsCrossed,
    text: "Daily meals, guest meals, member-wise totals, and monthly billing work together so mess accounting stays clear.",
  },
  {
    title: "Member Management",
    icon: Users,
    text: "Keep member profiles, roles, status, and billing context organized for admins, managers, and personal member views.",
  },
  {
    title: "Bazaar & Expense Tracking",
    icon: ReceiptText,
    text: "Record market purchases and shared costs, then connect spending with monthly meal and report calculations.",
  },
  {
    title: "Deposit & Due Management",
    icon: Wallet,
    text: "Track deposits, compare them against calculated bills, and understand dues without manual spreadsheet friction.",
  },
  {
    title: "Analytics & Reports",
    icon: BarChart3,
    text: "Summaries, charts, member bills, totals, and print-ready reporting help owners make faster decisions.",
  },
  {
    title: "Modern Theme Engine",
    icon: Palette,
    text: "Light, dark, system, and modern presets keep the workspace comfortable across different devices and preferences.",
  },
  {
    title: "Role-Based Access Control",
    icon: Fingerprint,
    text: "Admin, manager, and member experiences are separated so each person sees the tools meant for their role.",
  },
  {
    title: "Secure Workspace Isolation",
    icon: LockKeyhole,
    text: "Workspace data is scoped to the current mess owner and personal member views are intentionally limited.",
  },
  {
    title: "Mobile Optimized Experience",
    icon: MonitorSmartphone,
    text: "Responsive navigation, compact surfaces, and touch-friendly actions make daily work practical on phones.",
  },
  {
    title: "Export & Print System",
    icon: Download,
    text: "PDF, CSV, and print flows are designed for sharing monthly bills and preserving clean records.",
  },
];

const workflowSteps = [
  {
    title: "Meals are recorded daily",
    text: "Members can be tracked with regular and guest meal counts so the month has a reliable source of truth.",
    icon: CalendarClock,
  },
  {
    title: "Bazaar and deposits stay connected",
    text: "Expenses and deposits are stored as workspace activity, then used in bill and due calculations.",
    icon: TrendingUp,
  },
  {
    title: "Reports translate activity into bills",
    text: "The reporting layer combines meals, deposits, bazaar costs, and settings into clear member-wise summaries.",
    icon: BarChart3,
  },
  {
    title: "Exports support real-world sharing",
    text: "PDF, CSV, and print actions turn app data into polished records for meetings, notices, and monthly closing.",
    icon: ReceiptText,
  },
];

const roadmapItems = [
  "Smarter notification preferences",
  "Deeper monthly comparison charts",
  "More export templates",
  "Improved offline-friendly workflows",
];

function AnimatedCounter({
  value,
  suffix = "",
}) {
  const [
    count,
    setCount,
  ] = useState(0);

  useEffect(() => {
    const duration = 850;
    const start = performance.now();

    const tick = (time) => {
      const progress = Math.min(
        (time - start) / duration,
        1
      );
      const eased =
        1 -
        Math.pow(
          1 - progress,
          3
        );

      setCount(
        Math.round(
          value * eased
        )
      );

      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    };

    const frame =
      requestAnimationFrame(tick);

    return () =>
      cancelAnimationFrame(frame);
  }, [value]);

  return (
    <>
      {count}
      {suffix}
    </>
  );
}

function SectionTitle({
  eyebrow,
  title,
  subtitle,
}) {
  return (
    <motion.div
      variants={fadeUp}
      className="mb-5 max-w-3xl"
    >
      {eyebrow && (
        <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] theme-accent-text">
          {eyebrow}
        </p>
      )}
      <h2 className="text-xl font-black tracking-tight theme-text sm:text-2xl">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-2 text-sm leading-6 theme-muted-text sm:text-base">
          {subtitle}
        </p>
      )}
    </motion.div>
  );
}

function GlassPanel({
  children,
  className = "",
}) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{
        y: -3,
      }}
      transition={{
        duration: 0.28,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={`group relative overflow-hidden rounded-3xl border theme-card ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--accent)_18%,transparent),transparent_42%)]" />
      <div className="relative">
        {children}
      </div>
    </motion.div>
  );
}

export default function AboutMessManagerPage() {
  return (
    <div className="min-h-full overflow-hidden px-4 py-5 sm:px-6 lg:px-8">
      <motion.section
        initial="hidden"
        animate="show"
        variants={stagger}
        className="mx-auto max-w-7xl space-y-7"
      >
        <motion.div
          variants={fadeUp}
          className="relative overflow-hidden rounded-[2rem] border theme-card p-5 sm:p-8 lg:p-10"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_12%,color-mix(in_srgb,var(--accent)_32%,transparent),transparent_28%),radial-gradient(circle_at_92%_8%,rgba(6,182,212,.22),transparent_30%),linear-gradient(135deg,rgba(255,255,255,.14),transparent_52%)]" />
          <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-70" />

          <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black theme-muted theme-accent-text">
                <Sparkles size={14} />
                MessManager Workspace
              </div>

              <h1 className="max-w-4xl text-3xl font-black tracking-tight theme-text sm:text-5xl lg:text-6xl">
                About MessManager
              </h1>

              <p className="mt-5 max-w-3xl text-sm leading-7 theme-muted-text sm:text-base">
                MessManager is a smart mess workspace for daily meal records,
                member operations, bazaar costs, deposits, reports, exports, and
                role-aware collaboration. It is designed to make shared living
                finance feel organized, transparent, and fast.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {[
                  "Safe public overview",
                  "Role-aware workspace",
                  "PDF and CSV ready",
                  "Dark and light compatible",
                ].map((badge) => (
                  <span
                    key={badge}
                    className="rounded-full border theme-muted px-3 py-1 text-xs font-bold theme-text shadow-sm"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            </div>

            <GlassPanel className="p-5 sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] theme-muted-text">
                    App Profile
                  </p>
                  <h2 className="mt-2 text-2xl font-black theme-text">
                    Smart Manager
                  </h2>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-3xl theme-accent-bg text-white shadow-xl shadow-[color-mix(in_srgb,var(--accent)_28%,transparent)]">
                  <Gem size={24} />
                </div>
              </div>

              <div className="space-y-3">
                {[
                  ["Version", "2.0 Workspace"],
                  ["Privacy", "Workspace scoped"],
                  ["Security", "Role-based access"],
                  ["Experience", "Responsive SaaS UI"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-3 rounded-2xl border theme-muted px-4 py-3 text-sm"
                  >
                    <span className="theme-muted-text">
                      {label}
                    </span>
                    <span className="font-black theme-text">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </GlassPanel>
          </div>
        </motion.div>

        <motion.div
          variants={stagger}
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <GlassPanel
                key={stat.label}
                className="p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] theme-muted-text">
                      {stat.label}
                    </p>
                    <p className="mt-3 text-3xl font-black theme-text">
                      <AnimatedCounter
                        value={stat.value}
                        suffix={stat.suffix}
                      />
                    </p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--accent)_13%,transparent)] text-[var(--accent)]">
                    <Icon size={19} />
                  </div>
                </div>
              </GlassPanel>
            );
          })}
        </motion.div>

        <motion.section
          variants={stagger}
          className="space-y-5"
        >
          <SectionTitle
            eyebrow="Core features"
            title="Everything needed for clean mess operations"
            subtitle="The page only describes safe public product capabilities. It does not expose Firebase configuration, API keys, project IDs, database internals, secrets, or hidden admin data."
          />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {featureCards.map((feature) => {
              const Icon = feature.icon;

              return (
                <GlassPanel
                  key={feature.title}
                  className="p-5"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--accent)_13%,transparent)] text-[var(--accent)] shadow-lg shadow-[color-mix(in_srgb,var(--accent)_10%,transparent)]">
                    <Icon size={21} />
                  </div>
                  <h3 className="text-base font-black theme-text">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 theme-muted-text">
                    {feature.text}
                  </p>
                </GlassPanel>
              );
            })}
          </div>
        </motion.section>

        <motion.section
          variants={stagger}
          className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]"
        >
          <GlassPanel className="p-5 sm:p-6">
            <SectionTitle
              eyebrow="How it works"
              title="From meal entries to monthly reports"
              subtitle="MessManager keeps operational steps connected so monthly closing is easier to understand."
            />

            <div className="space-y-4">
              {workflowSteps.map((step, index) => {
                const Icon = step.icon;

                return (
                  <div
                    key={step.title}
                    className="relative flex gap-4 rounded-2xl border theme-muted p-4"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl theme-accent-bg text-sm font-black text-white">
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Icon
                          size={17}
                          className="theme-accent-text"
                        />
                        <h3 className="text-sm font-black theme-text">
                          {step.title}
                        </h3>
                      </div>
                      <p className="mt-1 text-sm leading-6 theme-muted-text">
                        {step.text}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassPanel>

          <div className="grid gap-5">
            <GlassPanel className="p-5 sm:p-6">
              <SectionTitle
                eyebrow="Safety"
                title="Privacy, roles, and workspace isolation"
                subtitle="The app is built around controlled access, scoped views, and public-safe reporting surfaces."
              />

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  {
                    icon: ShieldCheck,
                    title: "Safe by design",
                    text: "Sensitive implementation details stay out of the interface.",
                  },
                  {
                    icon: UserCog,
                    title: "Role clarity",
                    text: "Admin, manager, and member screens match each person’s responsibility.",
                  },
                  {
                    icon: LockKeyhole,
                    title: "Workspace scoped",
                    text: "Data is organized around the active mess workspace.",
                  },
                  {
                    icon: Gauge,
                    title: "Performance-aware",
                    text: "Responsive layouts and focused data views keep the UI quick.",
                  },
                ].map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.title}
                      className="rounded-2xl border theme-muted p-4"
                    >
                      <Icon
                        size={20}
                        className="theme-accent-text"
                      />
                      <h3 className="mt-3 text-sm font-black theme-text">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-xs leading-5 theme-muted-text">
                        {item.text}
                      </p>
                    </div>
                  );
                })}
              </div>
            </GlassPanel>

            <GlassPanel className="p-5 sm:p-6">
              <SectionTitle
                eyebrow="Roadmap"
                title="Future improvements"
                subtitle="A focused path for improving reports, exports, notifications, and daily reliability."
              />

              <div className="space-y-3">
                {roadmapItems.map((item, index) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-2xl border theme-muted px-4 py-3"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--accent)_13%,transparent)] text-xs font-black theme-accent-text">
                      {index + 1}
                    </div>
                    <span className="text-sm font-bold theme-text">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </GlassPanel>
          </div>
        </motion.section>

        <motion.section
          variants={stagger}
          className="grid gap-5 lg:grid-cols-[1fr_0.85fr]"
        >
          <GlassPanel className="p-5 sm:p-6">
            <SectionTitle
              eyebrow="Developer"
              title="MD RIJOAN RAFI"
              subtitle="CSE Student / Developer"
            />

            <div className="flex flex-col gap-5 sm:flex-row">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl theme-accent-bg text-2xl font-black text-white shadow-xl shadow-[color-mix(in_srgb,var(--accent)_28%,transparent)]">
                MR
              </div>
              <div>
                <p className="text-sm leading-7 theme-muted-text">
                  MD Rijoan Rafi builds modern web applications with a focus on
                  clean UI/UX, responsive experiences, performance, and scalable
                  architecture. MessManager reflects a practical interest in
                  solving real community management problems with Firebase and
                  modern web technology.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {[
                    "Modern web apps",
                    "Performance focused",
                    "UI/UX care",
                    "Scalable architecture",
                    "Firebase technology",
                  ].map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full border px-3 py-1 text-xs font-bold theme-muted-text"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </GlassPanel>

          <GlassPanel className="p-5 sm:p-6">
            <SectionTitle
              eyebrow="Overview"
              title="Built for trust and clarity"
              subtitle="A smart workspace is only useful when it stays understandable."
            />

            <div className="space-y-3">
              {[
                {
                  icon: BadgeCheck,
                  title: "Useful",
                  text: "Reduces manual calculation and keeps monthly records organized.",
                },
                {
                  icon: Activity,
                  title: "Modern",
                  text: "Animated, responsive, and compatible with the theme system.",
                },
                {
                  icon: Rocket,
                  title: "Built with passion",
                  text: "Designed as a polished product experience, not just a utility screen.",
                },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.title}
                    className="flex gap-3 rounded-2xl border theme-muted p-4"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--accent)_13%,transparent)] theme-accent-text">
                      <Icon size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black theme-text">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-xs leading-5 theme-muted-text">
                        {item.text}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassPanel>
        </motion.section>

        <motion.footer
          variants={fadeUp}
          className="rounded-3xl border theme-card px-5 py-4 text-center text-sm font-bold theme-muted-text"
        >
          Built with passion for smoother mess management.
        </motion.footer>
      </motion.section>
    </div>
  );
}

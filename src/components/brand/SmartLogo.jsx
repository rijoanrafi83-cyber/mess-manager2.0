import { motion } from "framer-motion";

export function SmartLogo({
  collapsed = false,
  title = "MessManager",
}) {
  return (
    <div
      className={`flex items-center gap-3 ${
        collapsed ? "justify-center" : ""
      }`}
    >
      <motion.div
        whileHover={{
          y: -1,
          scale: 1.04,
        }}
        transition={{
          type: "spring",
          stiffness: 320,
          damping: 18,
        }}
        className="group relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-2xl glass-solid shadow-2xl shadow-[color-mix(in_srgb,var(--accent)_28%,transparent)]"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_18%,rgba(255,255,255,.48),transparent_27%),linear-gradient(135deg,color-mix(in_srgb,var(--accent)_92%,#ffffff),#06b6d4_48%,#10b981)]" />
        <div className="absolute inset-[1px] rounded-2xl border border-white/25 bg-black/5" />
        <svg
          viewBox="0 0 48 48"
          aria-hidden="true"
          className="relative h-full w-full text-white drop-shadow"
        >
          <defs>
            <linearGradient
              id="mess-logo-stroke"
              x1="10"
              y1="8"
              x2="39"
              y2="40"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="white" />
              <stop
                offset="0.55"
                stopColor="#d9fbff"
              />
              <stop
                offset="1"
                stopColor="#b7ffe6"
              />
            </linearGradient>
          </defs>
          <circle
            cx="24"
            cy="24"
            r="13.5"
            fill="rgba(2,6,23,.18)"
            stroke="url(#mess-logo-stroke)"
            strokeWidth="2.3"
          />
          <path
            d="M15.5 25.5h17.2c1.6 0 2.8 1.3 2.5 2.9-.8 4.4-4.7 7.7-11.2 7.7s-10.4-3.3-11.2-7.7c-.3-1.6 1-2.9 2.7-2.9Z"
            fill="rgba(255,255,255,.2)"
            stroke="url(#mess-logo-stroke)"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M17 18.2v-6.1M20.2 18.2v-6.1M17 15.2h3.2"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M31.7 12.4v7.5c0 1.3 1 2.4 2.3 2.4h.9"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="m20.4 29.7 3.1-3.2 2.7 2.4 4.2-4.7"
            fill="none"
            stroke="#0f172a"
            strokeOpacity=".42"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="m20.4 29.7 3.1-3.2 2.7 2.4 4.2-4.7"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M34.8 14.2h3.3l-2.4 4.2h3.1l-5.1 6 .9-4.4h-2.7l2.9-5.8Z"
            fill="white"
            opacity=".94"
          />
        </svg>
        <div className="absolute inset-0 rounded-2xl ring-1 ring-white/10 transition group-hover:ring-white/30" />
      </motion.div>

      {!collapsed && (
        <div className="min-w-0 overflow-hidden">
          <p className="truncate text-sm font-black leading-none theme-text">
            {title}
          </p>
          <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-[0.18em] theme-accent-text">
            Smart Manager
          </p>
        </div>
      )}
    </div>
  );
}

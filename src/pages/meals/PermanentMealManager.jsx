/**
 * PermanentMealManager
 *
 * Self-contained component for managing automatic daily meal settings.
 * Extracted from MealsPage to reduce file complexity.
 *
 * Handles:
 * - Per-member meal toggle (breakfast/lunch/dinner)
 * - Bulk enable/disable for all members
 * - Visual status display with auto-meal preview
 */

import { useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  Check,
  Coffee,
  Moon,
  Power,
  Sparkles,
  Sun,
  X,
} from "lucide-react";

import { Card, Button, Badge } from "../../components/ui";
import { PersonAvatar } from "../../components/SmartUI";
import { saveMealSettings } from "../../services/firestoreService";
import {
  MEAL_KEYS,
  getAutoMealPreview,
  getSettingForMember,
  resolveBreakfastMode,
  getNextBreakfastMode,
  BREAKFAST_MODES,
} from "../../utils/permanentMeals";
import { BreakfastModeToggle } from "./BreakfastModeToggle";

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

export function PermanentMealManager({
  members,
  meals,
  mealSettings,
  ownerId,
  userProfile,
  isAdmin,
  stats,
}) {
  const [savingKey, setSavingKey] = useState("");

  const toggleMemberMeal = async (member, field) => {
    if (!isAdmin || !ownerId) return;

    const setting = getSettingForMember(mealSettings, member.id);
    const updated = {
      breakfast: Boolean(setting.breakfast),
      lunch: Boolean(setting.lunch),
      dinner: Boolean(setting.dinner),
      [field]: !setting[field],
    };

    setSavingKey(`${member.id}_${field}`);

    try {
      await saveMealSettings(ownerId, member.id, updated, userProfile);
      toast.success(
        `${member.name} ${mealMeta[field].label} ${updated[field] ? "enabled" : "disabled"}`
      );
    } catch (err) {
      console.error(err);
      toast.error("Permanent meal update failed");
    } finally {
      setSavingKey("");
    }
  };

  const cycleBreakfastMode = async (member) => {
    if (!isAdmin || !ownerId) return;
    const setting = getSettingForMember(mealSettings, member.id);
    const currentMode = resolveBreakfastMode(setting);
    const nextMode = getNextBreakfastMode(currentMode);

    setSavingKey(`${member.id}_breakfast`);
    try {
      await saveMealSettings(ownerId, member.id, {
        breakfast: nextMode !== "off",
        breakfastMode: nextMode,
        lunch: Boolean(setting.lunch),
        dinner: Boolean(setting.dinner),
      }, userProfile);
      toast.success(`${member.name} breakfast set to ${nextMode}`);
    } catch (err) {
      console.error(err);
      toast.error("Permanent meal update failed");
    } finally {
      setSavingKey("");
    }
  };

  const setAllBreakfast = async (mode) => {
    if (!isAdmin || !ownerId) return;
    setSavingKey(`bulk_breakfast_${mode}`);
    try {
      await Promise.all(
        members.map((member) => {
          const setting = getSettingForMember(mealSettings, member.id);
          return saveMealSettings(ownerId, member.id, {
            breakfastMode: mode,
            breakfast: mode !== "off",
            lunch: Boolean(setting.lunch),
            dinner: Boolean(setting.dinner),
          }, userProfile);
        })
      );
      toast.success(`Breakfast ${mode} for all members`);
    } catch (err) {
      console.error(err);
      toast.error("Bulk permanent meal update failed");
    } finally {
      setSavingKey("");
    }
  };

  const setAllForMeal = async (field, value) => {
    if (!isAdmin || !ownerId) return;

    setSavingKey(`bulk_${field}_${value}`);

    try {
      await Promise.all(
        members.map((member) => {
          const setting = getSettingForMember(mealSettings, member.id);
          return saveMealSettings(ownerId, member.id, {
            breakfast: Boolean(setting.breakfast),
            lunch: Boolean(setting.lunch),
            dinner: Boolean(setting.dinner),
            [field]: value,
          }, userProfile);
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
    <Card className="mb-6 overflow-hidden p-0">
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
                ON meals are written into today&#39;s meal history as editable Firestore meal entries, then counted everywhere like normal meals.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 min-w-full sm:min-w-[420px]">
            <div className="rounded-2xl theme-muted p-3">
              <p className="text-[11px] font-bold uppercase theme-muted-text">Enabled</p>
              <p className="text-xl font-black theme-text">{stats.membersEnabled}</p>
            </div>
            <div className="rounded-2xl theme-muted p-3">
              <p className="text-[11px] font-bold uppercase theme-muted-text">Today Rows</p>
              <p className="text-xl font-black theme-text">{stats.entries}</p>
            </div>
            <div className="rounded-2xl theme-muted p-3">
              <p className="text-[11px] font-bold uppercase theme-muted-text">Today Units</p>
              <p className="text-xl font-black theme-text">{stats.units.toFixed(1)}</p>
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="flex flex-wrap items-center gap-3 mt-6">
            {MEAL_KEYS.map((key) => {
              const meta = mealMeta[key];
              return (
                <div key={key} className="flex items-center gap-2 rounded-2xl theme-muted p-1.5">
                  <span className="pl-2 text-xs font-bold theme-muted-text">{meta.label}</span>
                  {key === "breakfast" ? (
                    <>
                      <Button size="xs" variant="ghost" disabled={Boolean(savingKey)} onClick={() => setAllBreakfast("off")}>Off</Button>
                      <Button size="xs" variant="success" disabled={Boolean(savingKey)} onClick={() => setAllBreakfast("half")}>Half</Button>
                      <Button size="xs" variant="success" disabled={Boolean(savingKey)} onClick={() => setAllBreakfast("full")}>Full</Button>
                    </>
                  ) : (
                    <>
                      <Button size="xs" variant="success" disabled={Boolean(savingKey)} onClick={() => setAllForMeal(key, true)}>All ON</Button>
                      <Button size="xs" variant="danger" disabled={Boolean(savingKey)} onClick={() => setAllForMeal(key, false)}>All OFF</Button>
                    </>
                  )}
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
              <th className="text-left px-5 py-4 text-xs font-black uppercase theme-muted-text">Member</th>
              {MEAL_KEYS.map((key) => (
                <th key={key} className="text-center px-4 py-4 text-xs font-black uppercase theme-muted-text">
                  {mealMeta[key].label}
                </th>
              ))}
              <th className="text-center px-5 py-4 text-xs font-black uppercase theme-muted-text">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-soft)]">
            {members.map((member, index) => {
              const setting = getSettingForMember(mealSettings, member.id);
              const preview = getAutoMealPreview({ meals, mealSettings, memberId: member.id });
              const enabled = preview.enabled;

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
                      <PersonAvatar name={member.name} size="sm" status={enabled.length ? "active" : "inactive"} />
                      <div className="min-w-0">
                        <p className="font-black theme-text truncate">{member.name}</p>
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
                    if (key === "breakfast") {
                      const mode = resolveBreakfastMode(setting);
                      return (
                        <td key={key} className="px-4 py-4 text-center">
                          <BreakfastModeToggle
                            mode={mode}
                            disabled={!isAdmin || Boolean(savingKey)}
                            memberName={member.name}
                            onCycle={() => cycleBreakfastMode(member)}
                          />
                        </td>
                      );
                    }

                    const active = Boolean(setting[key]);
                    const Icon = active ? Check : X;
                    const meta = mealMeta[key];

                    return (
                      <td key={key} className="px-4 py-4 text-center">
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.94 }}
                          disabled={!isAdmin || Boolean(savingKey)}
                          onClick={() => toggleMemberMeal(member, key)}
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
                    <Badge variant={enabled.length ? "success" : "default"} className="rounded-full px-3 py-1">
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

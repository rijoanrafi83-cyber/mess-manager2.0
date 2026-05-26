import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import { Modal, Button, Input, Select } from "../ui";
import { MemberSelector } from "./MemberSelector";
import {
  BILLING_MODES,
  BILLING_MODE_OPTIONS,
  EXTRA_BILL_CATEGORIES,
  computeBillAmounts,
} from "../../utils/extraBillConstants";
import { validateExtraBill } from "../../utils/extraBillValidation";
import { addExtraCost, updateExtraCost } from "../../services/firestoreService";
import { formatCurrency } from "../../utils/billing";

const today = () => new Date().toISOString().split("T")[0];

export function BillForm({ open, onClose, ownerId, members = [], editBill = null, userProfile }) {
  const isEdit = Boolean(editBill?.id);
  const activeMembers = members.filter((m) => m.status !== "inactive");

  const [form, setForm] = useState({
    title: "",
    billingMode: BILLING_MODES.TOTAL_SHARED,
    amount: "",
    category: "other",
    isRecurring: false,
    selectedMemberIds: [],
    date: today(),
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Initialize form when opening or switching between create/edit
  useEffect(() => {
    if (!open) return;

    if (editBill) {
      setForm({
        title: editBill.title || "",
        billingMode: editBill.billingMode || BILLING_MODES.TOTAL_SHARED,
        amount: String(editBill.amount || ""),
        category: editBill.category || "other",
        isRecurring: editBill.isRecurring || false,
        selectedMemberIds: editBill.selectedMemberIds || activeMembers.map((m) => m.id),
        date: editBill.date || today(),
      });
    } else {
      setForm({
        title: "",
        billingMode: BILLING_MODES.TOTAL_SHARED,
        amount: "",
        category: "other",
        isRecurring: false,
        selectedMemberIds: activeMembers.map((m) => m.id),
        date: today(),
      });
    }
    setErrors({});
  }, [open, editBill, activeMembers.length]);

  const set = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleModeChange = (mode) => {
    set("billingMode", mode);
    set("amount", "");
  };

  // Real-time calculation preview
  const { memberShare, totalAmount } = computeBillAmounts(
    form.billingMode,
    Number(form.amount) || 0,
    form.selectedMemberIds.length
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validation = validateExtraBill({
      title: form.title,
      amount: form.amount,
      selectedMemberIds: form.selectedMemberIds,
    });

    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setLoading(true);

    try {
      const payload = {
        title: form.title.trim(),
        billingMode: form.billingMode,
        amount: Number(form.amount),
        totalAmount,
        selectedMemberIds: form.selectedMemberIds,
        memberShare,
        category: form.category,
        isRecurring: form.isRecurring,
        date: form.date,
      };

      if (isEdit) {
        await updateExtraCost(editBill.id, { ...payload, ownerId }, userProfile, ownerId);
        toast.success("Extra bill updated");
      } else {
        await addExtraCost(ownerId, payload, userProfile);
        toast.success("Extra bill added");
      }

      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to save extra bill");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const currency = "৳";

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? "Edit Extra Bill" : "Add Extra Bill"}
      subtitle="Configure billing mode, amount, and member selection"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider theme-muted-text">
            Billing Mode
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {BILLING_MODE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleModeChange(option.value)}
                className={`rounded-2xl border px-4 py-3 text-sm font-bold text-left transition ${
                  form.billingMode === option.value
                    ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] theme-text"
                    : "theme-muted theme-muted-text hover:bg-[var(--bg-card)]"
                }`}
              >
                {option.label}
                <span className="block text-[10px] font-normal mt-1 opacity-70">
                  {option.value === BILLING_MODES.TOTAL_SHARED
                    ? "Split total equally among selected members"
                    : "Amount per member × selected count"}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Bill Title"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="e.g., Wifi - June"
            error={errors.title}
            required
          />
          <Input
            label={form.billingMode === BILLING_MODES.TOTAL_SHARED ? "Total Amount (৳)" : "Amount Per Member (৳)"}
            type="number"
            min="0.01"
            step="0.01"
            value={form.amount}
            onChange={(e) => set("amount", e.target.value)}
            placeholder="Enter amount"
            error={errors.amount}
            required
          />
        </div>
        {Number(form.amount) > 0 && form.selectedMemberIds.length > 0 && (
          <div className="rounded-2xl border theme-muted p-4">
            <div className="flex items-center justify-between gap-4 text-sm">
              {form.billingMode === BILLING_MODES.TOTAL_SHARED ? (
                <>
                  <span className="theme-muted-text">Per Member Share:</span>
                  <span className="font-black theme-accent-text">
                    {formatCurrency(memberShare, currency)}
                  </span>
                </>
              ) : (
                <>
                  <span className="theme-muted-text">Total ({form.selectedMemberIds.length} members):</span>
                  <span className="font-black theme-accent-text">
                    {formatCurrency(totalAmount, currency)}
                  </span>
                </>
              )}
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Category"
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
          >
            {EXTRA_BILL_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </Select>
          <Input
            label="Date"
            type="date"
            value={form.date}
            onChange={(e) => set("date", e.target.value)}
            required
          />
        </div>
        <div className="flex items-center justify-between gap-4 rounded-2xl border theme-muted p-4">
          <div>
            <p className="text-sm font-semibold theme-text">Recurring Monthly</p>
            <p className="text-xs theme-muted-text mt-0.5">Auto-carry this bill to next month</p>
          </div>
          <button
            type="button"
            onClick={() => set("isRecurring", !form.isRecurring)}
            className={`relative h-7 w-12 shrink-0 rounded-full p-1 transition ${
              form.isRecurring ? "" : "theme-elevated"
            }`}
            style={{ backgroundColor: form.isRecurring ? "var(--accent)" : undefined }}
          >
            <span
              className="block h-5 w-5 rounded-full bg-white shadow-lg transition-transform"
              style={{ transform: form.isRecurring ? "translateX(20px)" : "translateX(0)" }}
            />
          </button>
        </div>
        <div>
          <MemberSelector
            members={activeMembers}
            selectedIds={form.selectedMemberIds}
            onChange={(ids) => set("selectedMemberIds", ids)}
          />
          {errors.members && (
            <p className="mt-2 text-xs text-red-500 font-semibold">{errors.members}</p>
          )}
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={loading} className="flex-1">
            {isEdit ? "Update Bill" : "Add Extra Bill"}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Calendar, XCircle } from "lucide-react";

import {
  toggleExtraCostRecurring,
  carryForwardRecurringBills,
} from "../../services/firestoreService";
import { formatCurrency } from "../../utils/billing";
import { EXTRA_BILL_CATEGORIES, BILLING_MODES } from "../../utils/extraBillConstants";
import { Button, Badge } from "../ui";
import { SmartSection } from "../SmartUI";

const categoryLabel = (value) =>
  EXTRA_BILL_CATEGORIES.find((c) => c.value === value)?.label || "Other";

function getNextMonthDate() {
  const now = new Date();
  const year = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
  const month = (now.getMonth() + 1) % 12 + 1;
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

function getNextMonthLabel() {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return next.toLocaleString("default", { month: "long", year: "numeric" });
}

export function NextMonthPreview({ extraCosts = [], ownerId, userProfile }) {
  const [disablingId, setDisablingId] = useState("");
  const [carryingForward, setCarryingForward] = useState(false);

  const recurringBills = useMemo(
    () => extraCosts.filter((bill) => bill.isRecurring),
    [extraCosts]
  );

  const handleDisableRecurring = async (bill) => {
    setDisablingId(bill.id);
    try {
      await toggleExtraCostRecurring(bill.id, false, userProfile, ownerId);
      toast.success(`Recurring disabled for "${bill.title}"`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to disable recurring");
    } finally {
      setDisablingId("");
    }
  };

  const handleCarryForward = async () => {
    if (!recurringBills.length) return;
    setCarryingForward(true);
    try {
      const targetDate = getNextMonthDate();
      await carryForwardRecurringBills(ownerId, recurringBills, targetDate, userProfile);
      toast.success(`${recurringBills.length} bill${recurringBills.length === 1 ? "" : "s"} carried to ${getNextMonthLabel()}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to carry forward bills");
    } finally {
      setCarryingForward(false);
    }
  };

  if (!recurringBills.length) return null;

  const currency = "৳";

  return (
    <SmartSection
      title="Next Month Preview"
      subtitle={`${recurringBills.length} recurring bill${recurringBills.length === 1 ? "" : "s"} will carry to ${getNextMonthLabel()}`}
      className="mb-6"
      actions={
        <Button
          size="sm"
          loading={carryingForward}
          onClick={handleCarryForward}
        >
          <Calendar size={14} />
          Carry Forward All
        </Button>
      }
    >
      <div className="space-y-2">
        {recurringBills.map((bill) => (
          <div
            key={bill.id}
            className="flex items-center justify-between gap-3 rounded-2xl border theme-muted p-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-bold theme-text truncate">{bill.title}</p>
                <Badge variant="default">{categoryLabel(bill.category)}</Badge>
              </div>
              <p className="text-xs theme-muted-text mt-1">
                {bill.billingMode === BILLING_MODES.PER_MEMBER_UNIT
                  ? `${formatCurrency(bill.amount, currency)}/member × ${(bill.selectedMemberIds || []).length}`
                  : `${formatCurrency(bill.totalAmount || bill.amount, currency)} shared`}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <p className="text-sm font-black theme-text">
                {formatCurrency(bill.totalAmount || bill.amount || 0, currency)}
              </p>
              <Button
                variant="ghost"
                size="xs"
                disabled={disablingId === bill.id}
                onClick={() => handleDisableRecurring(bill)}
              >
                <XCircle size={14} className="text-red-500" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </SmartSection>
  );
}

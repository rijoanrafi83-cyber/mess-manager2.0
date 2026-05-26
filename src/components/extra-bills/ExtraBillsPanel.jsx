import { useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { Plus, Edit2, Trash2, Receipt, RefreshCw } from "lucide-react";

import { PageWrapper, Card, Button, Badge, EmptyState } from "../ui";
import { MetricCard, SmartHero, SmartSection } from "../SmartUI";
import { BillForm } from "./BillForm";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { NextMonthPreview } from "./NextMonthPreview";
import { deleteExtraCost } from "../../services/firestoreService";
import { EXTRA_BILL_CATEGORIES, BILLING_MODES } from "../../utils/extraBillConstants";
import { formatCurrency } from "../../utils/billing";

const categoryLabel = (value) =>
  EXTRA_BILL_CATEGORIES.find((c) => c.value === value)?.label || "Other";

export function ExtraBillsPanel({ extraCosts = [], members = [], ownerId, userProfile }) {
  const canManage = ["admin", "manager"].includes(userProfile?.role);
  const [showAdd, setShowAdd] = useState(false);
  const [editBill, setEditBill] = useState(null);
  const [deleteBill, setDeleteBill] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const currency = "৳";

  // Summary metrics
  const totalAmount = useMemo(
    () => extraCosts.reduce((sum, bill) => sum + Number(bill.totalAmount || bill.amount || 0), 0),
    [extraCosts]
  );

  const recurringCount = useMemo(
    () => extraCosts.filter((bill) => bill.isRecurring).length,
    [extraCosts]
  );

  // Group by category
  const grouped = useMemo(() => {
    const map = {};
    extraCosts.forEach((bill) => {
      const cat = bill.category || "other";
      if (!map[cat]) map[cat] = [];
      map[cat].push(bill);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [extraCosts]);

  const handleDelete = async () => {
    if (!deleteBill) return;
    setDeleting(true);
    try {
      await deleteExtraCost(deleteBill.id, userProfile, ownerId);
      toast.success("Extra bill deleted");
      setDeleteBill(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete extra bill");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <PageWrapper>
      <SmartHero
        eyebrow="Shared Expense Management"
        title="Extra Bills"
        subtitle="Manage shared utility bills, recurring expenses, and per-member charges with flexible billing modes."
        metrics={[
          { label: "Total Bills", value: extraCosts.length, caption: "this month" },
          { label: "Total Amount", value: formatCurrency(totalAmount, currency), caption: "all extra bills" },
          { label: "Recurring", value: recurringCount, caption: "monthly carry-forward" },
          { label: "Categories", value: grouped.length, caption: "expense types" },
        ]}
        actions={canManage ? (
          <Button onClick={() => setShowAdd(true)}>
            <Plus size={16} /> Add Extra Bill
          </Button>
        ) : null}
      />
      {grouped.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 mb-6">
          {grouped.map(([cat, bills]) => (
            <MetricCard
              key={cat}
              label={categoryLabel(cat)}
              value={formatCurrency(
                bills.reduce((s, b) => s + Number(b.totalAmount || b.amount || 0), 0),
                currency
              )}
              caption={`${bills.length} bill${bills.length === 1 ? "" : "s"}`}
              icon={Receipt}
              tone="accent"
            />
          ))}
        </div>
      )}
      {canManage && recurringCount > 0 && (
        <NextMonthPreview
          extraCosts={extraCosts}
          ownerId={ownerId}
          userProfile={userProfile}
          members={members}
        />
      )}
      {grouped.length > 0 ? (
        <div className="space-y-4">
          {grouped.map(([cat, bills]) => (
            <SmartSection
              key={cat}
              title={categoryLabel(cat)}
              subtitle={`${bills.length} bill${bills.length === 1 ? "" : "s"} · ${formatCurrency(
                bills.reduce((s, b) => s + Number(b.totalAmount || b.amount || 0), 0),
                currency
              )}`}
            >
              <div className="space-y-2">
                {bills.map((bill) => (
                  <div
                    key={bill.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border theme-muted p-3 sm:p-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold theme-text truncate">{bill.title}</p>
                        <Badge variant={bill.billingMode === BILLING_MODES.PER_MEMBER_UNIT ? "info" : "purple"}>
                          {bill.billingMode === BILLING_MODES.PER_MEMBER_UNIT ? "Per Member" : "Shared"}
                        </Badge>
                        {bill.isRecurring && (
                          <Badge variant="success">
                            <RefreshCw size={10} /> Recurring
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs theme-muted-text mt-1">
                        {bill.date} · {(bill.selectedMemberIds || []).length} members · {formatCurrency(bill.memberShare || 0, currency)}/member
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <p className="text-sm font-black theme-text">
                        {formatCurrency(bill.totalAmount || bill.amount || 0, currency)}
                      </p>
                      {canManage && (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="xs" onClick={() => setEditBill(bill)}>
                            <Edit2 size={12} />
                          </Button>
                          <Button variant="danger" size="xs" onClick={() => setDeleteBill(bill)}>
                            <Trash2 size={12} />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </SmartSection>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={Receipt}
            title="No extra bills yet"
            description="Add shared utility bills, recurring expenses, or per-member charges."
            action={canManage ? (
              <Button onClick={() => setShowAdd(true)}>
                <Plus size={16} /> Add Extra Bill
              </Button>
            ) : null}
          />
        </Card>
      )}
      <AnimatePresence>
        {showAdd && (
          <BillForm
            open
            onClose={() => setShowAdd(false)}
            ownerId={ownerId}
            members={members}
            userProfile={userProfile}
          />
        )}
        {editBill && (
          <BillForm
            open
            onClose={() => setEditBill(null)}
            ownerId={ownerId}
            members={members}
            editBill={editBill}
            userProfile={userProfile}
          />
        )}
        {deleteBill && (
          <DeleteConfirmModal
            open
            onClose={() => setDeleteBill(null)}
            onConfirm={handleDelete}
            loading={deleting}
            billTitle={deleteBill.title}
            isRecurring={deleteBill.isRecurring}
          />
        )}
      </AnimatePresence>
    </PageWrapper>
  );
}

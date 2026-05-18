/**
 * Extra Bill Constants
 *
 * Shared constants for the Extra Bills billing modes feature.
 * Used by BillForm, ExtraBillsPanel, billing calculator, and reports.
 */

export const BILLING_MODES = {
  TOTAL_SHARED: "total_shared",
  PER_MEMBER_UNIT: "per_member_unit",
};

export const BILLING_MODE_OPTIONS = [
  { value: BILLING_MODES.TOTAL_SHARED, label: "Total Shared Bill" },
  { value: BILLING_MODES.PER_MEMBER_UNIT, label: "Per Member Unit Bill" },
];

export const EXTRA_BILL_CATEGORIES = [
  { value: "wifi", label: "Wifi" },
  { value: "electricity", label: "Electricity" },
  { value: "gas", label: "Gas" },
  { value: "khala", label: "Khala" },
  { value: "cleaning", label: "Cleaning" },
  { value: "water", label: "Water" },
  { value: "maintenance", label: "Maintenance" },
  { value: "other", label: "Other" },
];

/**
 * Normalize a legacy extra bill document that lacks the new fields.
 * Used at calculation time — does NOT mutate Firestore documents.
 *
 * @param {Object} bill - The raw extra bill document from Firestore
 * @param {Array} activeMembers - Currently active members in the workspace
 * @returns {Object} Normalized bill with all required fields
 */
export function normalizeLegacyBill(bill, activeMembers = []) {
  if (bill.billingMode) {
    return bill;
  }

  const amount = Number(bill.amount || 0);
  const memberIds = activeMembers.map((m) => m.id);
  const memberCount = memberIds.length || 1;

  return {
    ...bill,
    billingMode: BILLING_MODES.TOTAL_SHARED,
    amount,
    totalAmount: amount,
    selectedMemberIds: memberIds,
    memberShare: Math.round((amount / memberCount) * 100) / 100,
    category: bill.category || "other",
    isRecurring: bill.isRecurring || false,
  };
}

/**
 * Compute the member share and total amount for a bill based on its mode.
 *
 * @param {string} billingMode - 'total_shared' or 'per_member_unit'
 * @param {number} amount - The admin-entered amount
 * @param {number} memberCount - Number of selected members
 * @returns {{ memberShare: number, totalAmount: number }}
 */
export function computeBillAmounts(billingMode, amount, memberCount) {
  const safeAmount = Number(amount) || 0;
  const safeCount = Math.max(1, memberCount);

  if (billingMode === BILLING_MODES.PER_MEMBER_UNIT) {
    return {
      memberShare: safeAmount,
      totalAmount: safeAmount * safeCount,
    };
  }

  // Default: total_shared
  return {
    memberShare: Math.round((safeAmount / safeCount) * 100) / 100,
    totalAmount: safeAmount,
  };
}

/**
 * Extra Bill Validation
 *
 * Pure validation functions for extra bill form data.
 * No side effects, no Firebase dependencies.
 */

/**
 * Validate extra bill form data before submission.
 *
 * @param {{ title: string, amount: string|number, selectedMemberIds: string[] }} data
 * @returns {{ valid: boolean, errors: { title?: string, amount?: string, members?: string } }}
 */
export function validateExtraBill({ title, amount, selectedMemberIds }) {
  const errors = {};

  // Title validation
  if (!title || !String(title).trim()) {
    errors.title = "Bill title is required";
  }

  // Amount validation
  const numAmount = Number(amount);
  if (!amount || isNaN(numAmount) || !isFinite(numAmount)) {
    errors.amount = "Please enter a valid number";
  } else if (numAmount <= 0) {
    errors.amount = "Amount must be a positive number";
  }

  // Member selection validation
  if (!selectedMemberIds || !Array.isArray(selectedMemberIds) || selectedMemberIds.length === 0) {
    errors.members = "At least one member must be selected";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

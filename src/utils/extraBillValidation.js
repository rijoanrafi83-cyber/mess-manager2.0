export function validateExtraBill({ title, amount, selectedMemberIds }) {
  const errors = {};

  if (!title || !String(title).trim()) {
    errors.title = "Bill title is required";
  }

  const numAmount = Number(amount);
  if (!amount || isNaN(numAmount) || !isFinite(numAmount)) {
    errors.amount = "Please enter a valid number";
  } else if (numAmount <= 0) {
    errors.amount = "Amount must be a positive number";
  }

  if (!selectedMemberIds || !Array.isArray(selectedMemberIds) || selectedMemberIds.length === 0) {
    errors.members = "At least one member must be selected";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

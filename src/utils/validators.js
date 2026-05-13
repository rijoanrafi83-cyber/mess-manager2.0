export const isValidAmount = (amount) => {
  return amount > 0 && amount < 50000;
};

export const isValidBreakfast = (value) => {
  return [0, 0.5, 1].includes(value);
};

export const sanitizeText = (text) => {
  return text.replace(/[<>]/g, "").trim();
};
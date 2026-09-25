export const extendStableModelOrder = (
  previousOrder = [],
  selectedModels = [],
) => {
  const nextOrder = [...previousOrder];

  selectedModels.forEach((model) => {
    if (!nextOrder.includes(model)) {
      nextOrder.push(model);
    }
  });

  return nextOrder;
};

// Converts #rgb / #rrggbb to rgba() for opacity control; other inputs pass through
export const hexToRgba = (hex, alpha) => {
  if (!/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) return hex;
  let digits = hex.slice(1);
  if (digits.length === 3) {
    digits = [...digits].map((d) => d + d).join("");
  }
  const value = parseInt(digits, 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
};

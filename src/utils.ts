// Generate a random HSL color with good contrast
export const generateColorHSL = (): string => {
  const hue = Math.floor(Math.random() * 360);
  const saturation = Math.floor(Math.random() * 20) + 60; // 60-80%
  const lightness = Math.floor(Math.random() * 20) + 35; // 35-55%
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};
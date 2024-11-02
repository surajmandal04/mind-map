// Generate a random HSL color with good contrast
export const generateColorHSL = (): string => {
  const hue = Math.floor(Math.random() * 360);
  const saturation = Math.floor(Math.random() * 20) + 60; // 60-80%
  const lightness = Math.floor(Math.random() * 20) + 35; // 35-55%
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

// Generate a deterministic color based on a string
export const stringToColor = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 45%)`;
};
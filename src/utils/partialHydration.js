// Placeholder utility for mapping settings to DOM nodes via data attributes

export function getUpdateInfo(element) {
  const info = element.getAttribute('data-update');
  if (!info) return null;
  try {
    return JSON.parse(info);
  } catch (err) {
    console.warn('Invalid data-update attribute:', err);
    return null;
  }
}

// Set while a window is locked for an assistant job: shortcuts and saves stand still.
let locked = false;

export function setEditorLocked(value) {
  locked = Boolean(value);
}

export function isEditorLocked() {
  return locked;
}

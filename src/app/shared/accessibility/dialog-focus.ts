const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'a[href]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

function focusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter((element) => !element.hasAttribute('hidden'));
}

export function focusDialog(
  container: HTMLElement,
  preferred?: HTMLElement | null,
): void {
  const target = preferred ?? focusableElements(container)[0] ?? container;
  target.focus();
}

export function trapDialogFocus(
  event: KeyboardEvent,
  container: HTMLElement,
): void {
  if (event.key !== 'Tab') return;

  const focusable = focusableElements(container);
  if (!focusable.length) {
    event.preventDefault();
    container.focus();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;
  if (event.shiftKey && (active === first || !container.contains(active))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}

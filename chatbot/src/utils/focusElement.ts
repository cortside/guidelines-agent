/**
 * Utility for managing focus on DOM elements with timing considerations
 */

/**
 * Focuses an element with a delay to ensure it happens after DOM updates
 * @param element - The element to focus
 * @param delay - Delay in milliseconds (default: 10ms)
 */
export function focusElement(element: HTMLElement | null, delay: number = 10): void {
  if (!element) return;
  
  setTimeout(() => {
    try {
      element.focus();
    } catch (error) {
      console.warn('Failed to focus element:', error);
    }
  }, delay);
}

/**
 * Focuses an element immediately (synchronously)
 * @param element - The element to focus
 */
export function focusElementImmediate(element: HTMLElement | null): void {
  if (!element) return;
  
  try {
    element.focus();
  } catch (error) {
    console.warn('Failed to focus element:', error);
  }
}

/**
 * Focuses an element after the next microtask (using setTimeout with 0 delay)
 * Useful for focusing after React state updates
 * @param element - The element to focus
 */
export function focusElementNextTick(element: HTMLElement | null): void {
  focusElement(element, 0);
}

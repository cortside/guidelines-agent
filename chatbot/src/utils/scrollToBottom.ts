// Utility to scroll to the bottom of a container
export function scrollToBottom(ref: React.RefObject<HTMLElement | null>) {
  if (ref.current) {
    ref.current.scrollTop = ref.current.scrollHeight;
  }
}

// Utility to check if a string is blank (empty or whitespace only)
export function isBlank(str: string): boolean {
  return !str || str.trim().length === 0;
}

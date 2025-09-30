// Utility to extract a user-friendly error message from an error object
export function getErrorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    return (error as any).message;
  }
  return "An unknown error occurred.";
}

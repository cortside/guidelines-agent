// Utility to parse/validate chat API response
export function parseChatResponse(res: any): string {
  if (!res || typeof res !== "object") {
    return "";
  }
  if ("answer" in res && typeof res.answer === "string") {
    return res.answer;
  }
  // Optionally handle error shapes or fallback
  if ("error" in res && typeof res.error === "string") {
    return res.error;
  }
  return "";
}

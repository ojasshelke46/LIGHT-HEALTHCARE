/**
 * Shared date/time formatting — all displayed timestamps go through here so
 * every portal renders consistently in the hospital's local timezone.
 */

const IST = "Asia/Kolkata";

export function formatIST(
  input: string | Date,
  style: "date" | "time" | "datetime" = "datetime",
): string {
  const d = typeof input === "string" ? new Date(input) : input;
  const opts: Intl.DateTimeFormatOptions =
    style === "date"
      ? { timeZone: IST, day: "2-digit", month: "short", year: "numeric" }
      : style === "time"
        ? { timeZone: IST, hour: "2-digit", minute: "2-digit", hour12: true }
        : {
            timeZone: IST,
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          };
  return new Intl.DateTimeFormat("en-IN", opts).format(d);
}

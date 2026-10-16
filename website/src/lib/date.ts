/** deterministic date formatting — same on server and client (no hydration drift) */
const dtf = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    // legacy hand-written posts keep their raw date strings
    return iso || "未知日期";
  }
  return dtf.format(date);
}

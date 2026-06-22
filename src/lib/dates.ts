const APP_TIME_ZONE = "Asia/Tbilisi";

function dateStringForOffset(offsetDays: number) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);

  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: APP_TIME_ZONE,
    year: "numeric"
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}`;
}

export function getTodayDateString() {
  return dateStringForOffset(0);
}

export function getTomorrowDateString() {
  return dateStringForOffset(1);
}

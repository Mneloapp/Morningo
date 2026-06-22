import { getTodayDateString, getTomorrowDateString } from "@/lib/dates";
import { type InboxItem } from "@/lib/types";

const MEETING_WORDS = ["meeting", "call", "შეხვედრა", "ზარი", "დარეკვა"];
const LEGAL_WORDS = ["court", "legal", "contract", "პროკურატურა", "სასამართლო", "ხელშეკრულება"];
const FINANCE_WORDS = ["invoice", "payment", "budget", "გადახდა", "ინვოისი", "ბიუჯეტი"];
const FOLLOW_UP_WORDS = ["follow", "check", "confirm", "მოკითხვა", "დადასტურება", "გადამოწმება"];

function includesAny(value: string, words: string[]) {
  return words.some((word) => value.includes(word));
}

function getCategory(title: string): InboxItem["category"] {
  const normalized = title.toLowerCase();

  if (includesAny(normalized, LEGAL_WORDS)) {
    return "legal";
  }

  if (includesAny(normalized, FINANCE_WORDS)) {
    return "finance";
  }

  if (includesAny(normalized, MEETING_WORDS)) {
    return "meeting";
  }

  if (includesAny(normalized, FOLLOW_UP_WORDS)) {
    return "follow_up";
  }

  return "general";
}

function getPriority(title: string, scheduledFor: string, category: InboxItem["category"]): InboxItem["priority"] {
  const normalized = title.toLowerCase();

  if (category === "legal" || normalized.includes("urgent") || normalized.includes("სასწრაფ")) {
    return "high";
  }

  if (scheduledFor === getTodayDateString() || category === "meeting") {
    return "medium";
  }

  return "low";
}

function extractCalendarStart(title: string, scheduledFor: string, category: InboxItem["category"]) {
  if (category !== "meeting" && !includesAny(title.toLowerCase(), MEETING_WORDS)) {
    return null;
  }

  const match = title.match(/(?:^|\s)([01]?\d|2[0-3])(?::([0-5]\d))?\s*(?:ზე)?(?:\s|$)/);

  if (!match) {
    return null;
  }

  const hour = match[1].padStart(2, "0");
  const minute = (match[2] ?? "00").padStart(2, "0");

  return `${scheduledFor}T${hour}:${minute}:00+04:00`;
}

function getReminderAt(calendarStartsAt: string | null, scheduledFor: string) {
  if (calendarStartsAt) {
    const start = new Date(calendarStartsAt);

    if (!Number.isNaN(start.getTime())) {
      return new Date(start.getTime() - 30 * 60 * 1000).toISOString();
    }
  }

  return `${scheduledFor}T09:00:00+04:00`;
}

function getSuggestedNextAction(title: string, category: InboxItem["category"]) {
  if (category === "meeting") {
    return `Confirm agenda and owner for: ${title}`;
  }

  if (category === "follow_up") {
    return `Send the follow-up and capture the answer: ${title}`;
  }

  if (category === "legal") {
    return `Clarify deadline, owner, and required document for: ${title}`;
  }

  if (category === "finance") {
    return `Check amount, due date, and approval path for: ${title}`;
  }

  return `Define the next concrete step for: ${title}`;
}

function getReason(category: InboxItem["category"], priority: InboxItem["priority"], scheduledFor: string) {
  const day = scheduledFor === getTomorrowDateString() ? "tomorrow" : "today";

  if (priority === "high") {
    return `High-priority ${category.replace("_", " ")} item scheduled for ${day}.`;
  }

  return `${category.replace("_", " ")} item scheduled for ${day}.`;
}

export function analyzeInboxItem(title: string, scheduledFor: string) {
  const category = getCategory(title);
  const priority = getPriority(title, scheduledFor, category);
  const calendarStartsAt = extractCalendarStart(title, scheduledFor, category);

  return {
    assistant_reason: getReason(category, priority, scheduledFor),
    calendar_starts_at: calendarStartsAt,
    category,
    priority,
    reminder_at: getReminderAt(calendarStartsAt, scheduledFor),
    suggested_next_action: getSuggestedNextAction(title, category)
  };
}

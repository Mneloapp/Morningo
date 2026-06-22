export type InboxItem = {
  id: string;
  user_id: string;
  title: string;
  scheduled_for: string;
  status: "planned" | "confirmed" | "done";
  priority: "low" | "medium" | "high";
  category: "general" | "meeting" | "follow_up" | "finance" | "legal" | "project" | "personal";
  suggested_next_action: string | null;
  assistant_reason: string | null;
  calendar_starts_at: string | null;
  reminder_at: string | null;
  confirmed_at: string | null;
  completed_at: string | null;
  created_at: string;
};

export type DailyBrief = {
  id: string;
  user_id: string;
  focus_today: string[];
  can_wait: string[];
  risks: string[];
  suggested_next_action: string;
  created_at: string;
};

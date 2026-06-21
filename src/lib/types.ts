export type InboxItem = {
  id: string;
  user_id: string;
  title: string;
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

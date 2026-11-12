import type { Status } from './scoring';

export type EventRow = {
  id: string;
  title: string;
  description: string;
  owner_id: string;
  start_month: string;
  month_count: number;
  min_days: number;
  confirmed_start: string | null;
  confirmed_end: string | null;
  confirmed_route_id: string | null;
  invite_code: string;
  created_at: string;
};

export type MemberRow = {
  event_id: string;
  user_id: string;
  joined_at: string;
  filled_at: string | null;
};

export type ProfileRow = { id: string; display_name: string };

export type AvailabilityRow = {
  event_id: string;
  user_id: string;
  day: string;
  status: Status;
  note: string;
};

export type RouteRow = {
  id: string;
  event_id: string;
  created_by: string;
  name: string;
  url: string;
  distance_km: number | null;
  elevation_m: number | null;
  created_at: string;
};

export type VoteRow = { route_id: string; user_id: string };

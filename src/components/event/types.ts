import type { AvailabilityRow, EventRow, MemberRow, ProfileRow, RouteRow, VoteRow } from '@/lib/types';

export type EventData = {
  event: EventRow;
  members: MemberRow[];
  profiles: Map<string, ProfileRow>;
  avail: AvailabilityRow[];
  routes: RouteRow[];
  votes: VoteRow[];
};

export type Ctx = {
  data: EventData;
  me: string;
  isOwner: boolean;
  reload: () => Promise<void>;
  toast: (msg: string) => void;
  name: (userId: string) => string;
};

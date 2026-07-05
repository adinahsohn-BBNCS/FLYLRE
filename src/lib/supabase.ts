import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type PilotSubmission = {
  id: string;
  created_at: string;
  name: string;
  email: string;
  aircraft: string | null;
  bio: string;
  photo_url: string | null;
  status: "pending" | "approved" | "rejected";
  reviewed_at: string | null;
};

export type EventSubmission = {
  id: string;
  created_at: string;
  title: string;
  event_date: string;
  event_time: string | null;
  location: string | null;
  description: string;
  submitter_name: string;
  submitter_email: string;
  status: "pending" | "approved" | "rejected";
  reviewed_at: string | null;
};

export type FlyoutSubmission = {
  id: string;
  created_at: string;
  name: string;
  meta: string | null;
  description: string;
  submitter_name: string;
  submitter_email: string;
  status: "pending" | "approved" | "rejected";
  reviewed_at: string | null;
};

export type EventRsvp = {
  id: string;
  created_at: string;
  event_id: string;
  name: string;
  email: string;
  guests: number;
  note: string | null;
  status: "pending" | "approved" | "rejected";
  reviewed_at: string | null;
};

export type EventPhoto = {
  id: string;
  created_at: string;
  event_id: string;
  submitter_name: string;
  submitter_email: string;
  photo_url: string;
  caption: string | null;
  status: "pending" | "approved" | "rejected";
  reviewed_at: string | null;
};

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) return client;

  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Missing PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_ANON_KEY");
  }

  client = createClient(url, key);
  return client;
}

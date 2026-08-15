/** Mirrors app/schemas/auth.py on the backend. */

export interface AuthUser {
  user_id: string;
  email: string;
  email_verified: boolean;
  is_verified: boolean;
  is_banned: boolean;
  role: "user" | "admin";
  created_at: string | null;
  last_login_at: string | null;
}

export interface Profile {
  user_id: string;
  username: string;
  email: string;
  avatar_url: string;
  mobile: string;
  address: string;
  bio: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface MeResponse {
  user: AuthUser;
  profile: Profile;
}

/**
 * What POST /auth/session and /auth/refresh return.
 *
 * No tokens here by design — both credentials arrive as HttpOnly cookies, so
 * there is nothing for client code to read, store, or leak.
 */
export interface SessionResponse extends MeResponse {
  expires_in: number;
}

/** The editable half of a profile. */
export interface ProfileUpdate {
  username?: string;
  avatar_url?: string;
  mobile?: string;
  address?: string;
  bio?: string;
}

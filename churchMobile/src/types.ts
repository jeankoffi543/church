/** Shared domain types for the mobile Hub (CHR-185). Mirror the central API. */

export type Identity = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  email_verified: boolean;
};

export type Church = {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  following: boolean;
};

export type Membership = {
  tenant_id: string;
  church: string | null;
  status: string;
  is_claimed: boolean;
  is_public: boolean;
  claimed_at: string | null;
};

export type Plan = {
  name: string;
  price: string;
  period?: string;
  description?: string;
  features: string[];
  cta_label?: string;
  highlighted?: boolean;
};

export type SiteSettings = {
  brand: { name: string; tagline?: string };
  banner: { enabled: boolean; text?: string; link_label?: string; link_url?: string };
  hero: {
    eyebrow?: string;
    title: string;
    title_accent?: string;
    subtitle?: string;
    cta_label?: string;
    cta_url?: string;
    secondary_label?: string;
    secondary_url?: string;
    trust: string[];
  };
  stats: { label: string; value: string }[];
  logos: string[];
  pricing: { currency?: string; plans: Plan[] };
  contact: { email?: string; phone?: string; address?: string };
  social: { linkedin?: string; x?: string; youtube?: string };
  footer: { note?: string };
  pages?: { title: string; slug: string }[];
};

export type Section =
  | { type: "hero"; eyebrow?: string; title: string; subtitle?: string; button_label?: string; button_url?: string }
  | { type: "rich_text"; body: string }
  | { type: "features"; title?: string; items: { title: string; body: string }[] }
  | { type: "stats"; items: { label: string; value: string }[] }
  | { type: "faq"; title?: string; items: { q: string; a: string }[] }
  | { type: "cta"; title: string; body?: string; button_label?: string; button_url?: string };

export type SectionType = Section["type"];

export type CmsPage = {
  id: number;
  title: string;
  slug: string;
  status: "draft" | "published" | "archived";
  template: string;
  published_at: string | null;
  updated_at: string;
  versions_count?: number;
  latest_version?: { version: number; content: Section[]; seo: { title?: string; description?: string } | null };
};

export type ResourceType = "tool" | "guide" | "template" | "checklist";

export type UniversityResource = {
  id: number;
  title: string;
  slug: string;
  category: string;
  type: ResourceType;
  tool_key: string | null;
  summary: string | null;
  body?: string | null;
  faqs?: { q: string; a: string }[] | null;
  sources?: { label: string; url?: string }[] | null;
  seo?: { title?: string; description?: string } | null;
  status?: "draft" | "published" | "archived";
  sort_order?: number;
  reviewed_at: string | null;
  updated_at?: string;
};

export type Lead = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: string;
  status: string;
  message: string | null;
  metadata: { notes?: { by: string; at: string; text: string }[]; referrer?: string } | null;
  created_at: string;
};

export type Paginated<T> = {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
};

export type Me = {
  user: { id: number; name: string; email: string; last_login_at: string | null };
  tenant: { id: number; name: string; slug: string };
  roles: string[];
  permissions: string[];
};

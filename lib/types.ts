export interface ResumeCard {
  slug: string;
  title: string;
  eyebrow?: string;
  subtitle: string;
  year: string;
  category: string[];
  image: string;
  objectFit?: 'cover' | 'contain' | 'contain-dark';
  description: string;
  /** Simple-page wording, for descriptions written for the 3D sphere. */
  simpleDescription?: string;
  /** Named buttons (live demo, slides, …); the first is the primary one. */
  links?: { label: string; url: string }[];
}

export interface ResumeProfile {
  name: string;
  role: string;
  email: string;
  tagline: string;
}

export interface ResumeSection {
  title: string;
  cards: ResumeCard[];
}

export interface ResumeData {
  profile: ResumeProfile;
  sections: ResumeSection[];
}

/** Lifecycle of the whole experience. */
export type ExperiencePhase =
  | "loading"
  | "intro"
  | "idle"
  | "focusing"
  | "focused"
  | "unfocusing";

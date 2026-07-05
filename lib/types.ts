export interface ResumeCard {
  slug: string;
  title: string;
  subtitle: string;
  year: string;
  category: string[];
  image: string;
  description: string;
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

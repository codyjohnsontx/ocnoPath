export type AgeGroup = "adult" | "pediatric";

export type SearchCriteria = {
  cancerType: string;
  stage?: string;
  biomarkers?: string;
  priorTreatments?: string;
  ageGroup: AgeGroup;
  location: string;
  radius: string;
  status: string[];
  phase?: string;
  willingnessToTravel?: string;
};

export type TrialLocation = {
  facility?: string;
  city?: string;
  state?: string;
  country?: string;
  zip?: string;
};

export type TrialRecord = {
  nctId: string;
  title: string;
  status: string;
  phase: string[];
  conditions: string[];
  briefSummary?: string;
  eligibilityCriteria?: string;
  locations: TrialLocation[];
  sourceUrl: string;
  lastUpdated?: string;
  rawSource?: unknown;
};

export type TrialExplanation = {
  nctId: string;
  plainEnglishSummary: string;
  whyMayBeRelevant: string[];
  possibleEligibilityConcerns: string[];
  missingInformation: string[];
  questionsForOncologyTeam: string[];
  sourceGroundedNotes: string[];
  safetyWarnings: string[];
  generatedAt: string;
  model?: string;
  sourceVersionKey: string;
};

export type SavedSearch = {
  id: string;
  label: string;
  params: Record<string, string>;
  createdAt: string;
};

export type DiscussionSheetState = {
  selectedTrialIds: string[];
  trialSnapshots: TrialRecord[];
  explanations: TrialExplanation[];
  updatedAt: string;
};

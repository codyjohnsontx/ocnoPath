import type { SearchCriteria, TrialRecord } from "@/lib/types";

const API_BASE = "https://clinicaltrials.gov/api/v2";

type CtStudy = {
  protocolSection?: {
    identificationModule?: {
      nctId?: string;
      briefTitle?: string;
      officialTitle?: string;
    };
    statusModule?: {
      overallStatus?: string;
      lastUpdatePostDateStruct?: { date?: string };
    };
    designModule?: {
      phases?: string[];
    };
    conditionsModule?: {
      conditions?: string[];
    };
    descriptionModule?: {
      briefSummary?: string;
    };
    eligibilityModule?: {
      eligibilityCriteria?: string;
    };
    contactsLocationsModule?: {
      locations?: CtLocation[];
    };
  };
};

type CtLocation = {
  facility?: string;
  city?: string;
  state?: string;
  country?: string;
  zip?: string;
};

export async function searchTrials(criteria: SearchCriteria): Promise<TrialRecord[]> {
  const params = new URLSearchParams();
  const terms = [
    criteria.cancerType,
    criteria.stage,
    criteria.biomarkers,
    criteria.priorTreatments
  ]
    .filter(Boolean)
    .join(" ");

  params.set("query.cond", terms || criteria.cancerType);
  params.set("pageSize", "12");
  params.set("format", "json");

  if (criteria.status.length) {
    params.set("filter.overallStatus", criteria.status.join(","));
  }

  if (criteria.location) {
    params.set("query.locn", criteria.location);
  }

  if (criteria.phase) {
    params.set("filter.phase", criteria.phase);
  }

  try {
    const response = await fetch(`${API_BASE}/studies?${params.toString()}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 * 60 }
    });

    if (!response.ok) throw new Error(`ClinicalTrials.gov returned ${response.status}`);

    const data = await response.json();
    const studies: CtStudy[] = Array.isArray(data.studies) ? data.studies : [];
    return studies.map(normalizeStudy).filter(Boolean).slice(0, 12) as TrialRecord[];
  } catch {
    return sampleTrials(criteria);
  }
}

export async function getTrialByNctId(nctId: string): Promise<TrialRecord | null> {
  try {
    const response = await fetch(`${API_BASE}/studies/${encodeURIComponent(nctId)}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 * 60 }
    });

    if (!response.ok) throw new Error(`ClinicalTrials.gov returned ${response.status}`);
    const data = await response.json();
    return normalizeStudy(data);
  } catch {
    return sampleTrials({
      cancerType: "cancer",
      ageGroup: "adult",
      location: "",
      radius: "100",
      status: ["RECRUITING"]
    }).find((trial) => trial.nctId === nctId) ?? null;
  }
}

function normalizeStudy(study: CtStudy): TrialRecord | null {
  const protocol = study.protocolSection;
  const identification = protocol?.identificationModule;
  const status = protocol?.statusModule;
  const design = protocol?.designModule;
  const conditions = protocol?.conditionsModule;
  const description = protocol?.descriptionModule;
  const eligibility = protocol?.eligibilityModule;
  const contacts = protocol?.contactsLocationsModule;

  const nctId = identification?.nctId;
  if (!nctId) return null;

  const locations =
    contacts?.locations?.map((location) => ({
      facility: location.facility,
      city: location.city,
      state: location.state,
      country: location.country,
      zip: location.zip
    })) ?? [];

  return {
    nctId,
    title:
      identification?.briefTitle ||
      identification?.officialTitle ||
      "Untitled clinical trial",
    status: status?.overallStatus || "UNKNOWN",
    phase: design?.phases ?? ["UNKNOWN"],
    conditions: conditions?.conditions ?? [],
    briefSummary: description?.briefSummary,
    eligibilityCriteria: eligibility?.eligibilityCriteria,
    locations,
    sourceUrl: `https://clinicaltrials.gov/study/${nctId}`,
    lastUpdated: status?.lastUpdatePostDateStruct?.date,
    rawSource: study
  };
}

function sampleTrials(criteria: Partial<SearchCriteria>): TrialRecord[] {
  const condition = criteria.cancerType || "cancer";

  return [
    {
      nctId: "NCT00000001",
      title: `Study of an investigational approach for ${condition}`,
      status: "RECRUITING",
      phase: ["PHASE2"],
      conditions: [condition],
      briefSummary:
        "This sample record is shown when the public trial API is unavailable. It demonstrates how OncoPath presents source-grounded trial information.",
      eligibilityCriteria:
        "Inclusion criteria may include confirmed diagnosis, adult age, adequate organ function, and ability to follow study procedures.\n\nExclusion criteria may include certain prior treatments, uncontrolled illness, or other conditions listed by the trial team.",
      locations: [
        {
          facility: "Example Cancer Center",
          city: "Austin",
          state: "Texas",
          country: "United States"
        }
      ],
      sourceUrl: "https://clinicaltrials.gov/",
      lastUpdated: "Sample data",
      rawSource: { sample: true }
    },
    {
      nctId: "NCT00000002",
      title: `Public trial record involving treatment sequencing for ${condition}`,
      status: "NOT_YET_RECRUITING",
      phase: ["PHASE1"],
      conditions: [condition],
      briefSummary:
        "This sample record illustrates a second trial card while preserving the safety boundaries of the product.",
      eligibilityCriteria:
        "Public eligibility criteria should be reviewed with an oncology care team and the trial team. This sample does not confirm eligibility.",
      locations: [
        {
          facility: "Example University Hospital",
          city: "Houston",
          state: "Texas",
          country: "United States"
        }
      ],
      sourceUrl: "https://clinicaltrials.gov/",
      lastUpdated: "Sample data",
      rawSource: { sample: true }
    }
  ];
}

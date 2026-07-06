import OpenAI from "openai";
import type { TrialExplanation, TrialRecord } from "@/lib/types";

const PROMPT_VERSION = "oncopath-explanation-v1";
const DEFAULT_OLLAMA_MODEL = "llama3.1:8b";
const DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434";
const prohibitedPatterns = [
  /you are eligible/i,
  /you qualify/i,
  /you should enroll/i,
  /best trial/i,
  /recommended treatment/i,
  /this will help/i,
  /this will cure/i,
  /improve survival/i,
  /guaranteed/i
];

export async function explainTrial(
  trial: TrialRecord,
  searchContext?: Record<string, unknown>
): Promise<TrialExplanation> {
  const provider = process.env.AI_PROVIDER || "fallback";

  if (provider === "ollama") {
    return explainWithOllama(trial, searchContext);
  }

  if (provider === "openai") {
    return explainWithOpenAI(trial, searchContext);
  }

  return fallbackExplanation(trial, "AI_PROVIDER is not configured for an external model.");
}

async function explainWithOpenAI(
  trial: TrialRecord,
  searchContext?: Record<string, unknown>
) {
  if (!process.env.OPENAI_API_KEY) {
    return fallbackExplanation(trial, "OPENAI_API_KEY is not configured.");
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: systemPrompt()
        },
        {
          role: "user",
          content: userPrompt(trial, searchContext)
        }
      ]
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return fallbackExplanation(trial, "AI response was empty.");

    const parsed = JSON.parse(content);
    const explanation: TrialExplanation = {
      nctId: trial.nctId,
      plainEnglishSummary: normalizeString(parsed.plainEnglishSummary),
      whyMayBeRelevant: normalizeList(parsed.whyMayBeRelevant),
      possibleEligibilityConcerns: normalizeList(parsed.possibleEligibilityConcerns),
      missingInformation: normalizeList(parsed.missingInformation),
      questionsForOncologyTeam: normalizeList(parsed.questionsForOncologyTeam),
      sourceGroundedNotes: normalizeList(parsed.sourceGroundedNotes),
      safetyWarnings: normalizeList(parsed.safetyWarnings),
      generatedAt: new Date().toISOString(),
      model: completion.model,
      sourceVersionKey: sourceVersionKey(trial)
    };

    return validateExplanation(explanation)
      ? explanation
      : fallbackExplanation(trial, "AI output did not pass safety validation.");
  } catch {
    return fallbackExplanation(trial, "AI explanation service was unavailable.");
  }
}

async function explainWithOllama(
  trial: TrialRecord,
  searchContext?: Record<string, unknown>
) {
  const baseUrl = process.env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_BASE_URL;
  const model = process.env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL;

  try {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        format: "json",
        options: {
          temperature: 0.2
        },
        messages: [
          {
            role: "system",
            content: systemPrompt()
          },
          {
            role: "user",
            content: userPrompt(trial, searchContext)
          }
        ]
      })
    });

    if (!response.ok) {
      return fallbackExplanation(
        trial,
        `Ollama returned ${response.status}. Confirm Ollama is running locally.`
      );
    }

    const data = await response.json();
    const content = data?.message?.content;
    if (!content || typeof content !== "string") {
      return fallbackExplanation(trial, "Ollama response was empty.");
    }

    const parsed = JSON.parse(content);
    const explanation: TrialExplanation = {
      nctId: trial.nctId,
      plainEnglishSummary: normalizeString(parsed.plainEnglishSummary),
      whyMayBeRelevant: normalizeList(parsed.whyMayBeRelevant),
      possibleEligibilityConcerns: normalizeList(parsed.possibleEligibilityConcerns),
      missingInformation: normalizeList(parsed.missingInformation),
      questionsForOncologyTeam: normalizeList(parsed.questionsForOncologyTeam),
      sourceGroundedNotes: normalizeList(parsed.sourceGroundedNotes),
      safetyWarnings: normalizeList(parsed.safetyWarnings),
      generatedAt: new Date().toISOString(),
      model: `ollama:${model}`,
      sourceVersionKey: sourceVersionKey(trial)
    };

    return validateExplanation(explanation)
      ? explanation
      : fallbackExplanation(trial, "Ollama output did not pass safety validation.");
  } catch {
    return fallbackExplanation(
      trial,
      "Ollama was unavailable. Run Ollama locally or use the fallback provider."
    );
  }
}

function systemPrompt() {
  return "You explain public cancer clinical trial records for patients and caregivers. You are not a doctor. Do not diagnose, recommend treatment, confirm eligibility, rank a trial as best, or tell a user to enroll. Use only the provided trial information. If information is missing, say it is not stated in the public trial record. Use cautious language such as may be relevant, appears potentially relevant, could be worth discussing, based on the public trial information, and ask your oncology team. Return only valid JSON.";
}

function userPrompt(trial: TrialRecord, searchContext?: Record<string, unknown>) {
  return JSON.stringify({
    instruction:
      "Explain this public trial record using the required schema. Do not invent eligibility details.",
    requiredSchema: {
      plainEnglishSummary: "string",
      whyMayBeRelevant: ["string"],
      possibleEligibilityConcerns: ["string"],
      missingInformation: ["string"],
      questionsForOncologyTeam: ["string"],
      sourceGroundedNotes: ["string"],
      safetyWarnings: ["string"]
    },
    trial: {
      nctId: trial.nctId,
      title: trial.title,
      status: trial.status,
      phase: trial.phase,
      conditions: trial.conditions,
      briefSummary: trial.briefSummary,
      eligibilityCriteria: trial.eligibilityCriteria,
      locations: trial.locations,
      lastUpdated: trial.lastUpdated,
      sourceUrl: trial.sourceUrl
    },
    searchContext: minimizeSearchContext(searchContext)
  });
}

function validateExplanation(explanation: TrialExplanation) {
  const text = JSON.stringify(explanation);
  const hasProhibitedLanguage = prohibitedPatterns.some((pattern) => pattern.test(text));
  const hasRequiredWarning = explanation.safetyWarnings.some((warning) =>
    /oncology care team.*trial team|trial team.*oncology care team/i.test(warning)
  );

  return (
    !hasProhibitedLanguage &&
    hasRequiredWarning &&
    Boolean(explanation.plainEnglishSummary) &&
    explanation.whyMayBeRelevant.length > 0 &&
    explanation.possibleEligibilityConcerns.length > 0 &&
    explanation.missingInformation.length > 0 &&
    explanation.questionsForOncologyTeam.length > 0
  );
}

function fallbackExplanation(trial: TrialRecord, reason: string): TrialExplanation {
  return {
    nctId: trial.nctId,
    plainEnglishSummary:
      trial.briefSummary ||
      "The public trial record does not include a brief summary that OncoPath can safely simplify.",
    whyMayBeRelevant: [
      `Based on the public trial information, this trial may be relevant because it lists ${trial.conditions.join(", ") || "a cancer-related condition"} in the trial record.`,
      "This does not mean the trial is appropriate or that someone is eligible."
    ],
    possibleEligibilityConcerns: [
      "Eligibility may depend on diagnosis details, stage, prior treatments, lab results, age, performance status, location, and trial-specific rules.",
      "Review the official eligibility criteria with your oncology care team and the trial team."
    ],
    missingInformation: [
      trial.eligibilityCriteria
        ? "OncoPath cannot determine how the listed eligibility criteria apply to an individual case."
        : "Eligibility criteria are not stated in the available public trial record.",
      "Personal medical details needed for screening are not collected or evaluated by OncoPath."
    ],
    questionsForOncologyTeam: [
      "Does this trial's diagnosis or condition description fit my situation?",
      "Do my prior treatments, test results, and overall health raise any concerns for this trial?",
      "Would the trial location, visit schedule, and study requirements be practical to discuss further?",
      "Who should I contact to ask the trial team about formal screening?"
    ],
    sourceGroundedNotes: [
      `Source: ${trial.sourceUrl}`,
      `Prompt version: ${PROMPT_VERSION}`,
      `Safety fallback used: ${reason}`
    ],
    safetyWarnings: [
      "Only your oncology care team and the trial team can determine whether this trial is appropriate for you."
    ],
    generatedAt: new Date().toISOString(),
    sourceVersionKey: sourceVersionKey(trial)
  };
}

function normalizeString(value: unknown) {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : "Not stated in the public trial record.";
}

function normalizeList(value: unknown) {
  if (!Array.isArray(value)) return ["Not stated in the public trial record."];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function minimizeSearchContext(searchContext?: Record<string, unknown>) {
  if (!searchContext) return undefined;
  return {
    cancerType: searchContext.cancerType,
    ageGroup: searchContext.ageGroup,
    stageProvided: Boolean(searchContext.stageProvided),
    biomarkersProvided: Boolean(searchContext.biomarkersProvided),
    priorTreatmentsProvided: Boolean(searchContext.priorTreatmentsProvided)
  };
}

function sourceVersionKey(trial: TrialRecord) {
  return `${trial.nctId}:${trial.lastUpdated || "unknown"}`;
}

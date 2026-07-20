import { z } from "zod";

export const searchCriteriaSchema = z.object({
  cancerType: z.string().min(2).max(120),
  stage: z.string().max(80).optional(),
  biomarkers: z.string().max(160).optional(),
  priorTreatments: z.string().max(240).optional(),
  ageGroup: z.enum(["adult", "pediatric"]),
  location: z.string().min(2).max(120),
  radius: z.preprocess(
    (value) => (value === null ? undefined : value),
    z.enum(["25", "50", "100", "250", "500"]).default("100")
  ),
  status: z.preprocess(
    (value) =>
      value === null || (Array.isArray(value) && value.length === 0)
        ? undefined
        : value,
    z
      .array(
        z.enum([
          "RECRUITING",
          "NOT_YET_RECRUITING",
          "ACTIVE_NOT_RECRUITING"
        ])
      )
      .min(1)
      .default(["RECRUITING"])
  ),
  phase: z
    .enum(["EARLY_PHASE1", "PHASE1", "PHASE2", "PHASE3", "PHASE4", "NA"])
    .optional()
});

export const trialLocationSchema = z.object({
  facility: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  zip: z.string().optional(),
  status: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  distanceMiles: z.number().optional()
});

export const trialRecordSchema = z.object({
  nctId: z.string(),
  title: z.string(),
  status: z.string(),
  phase: z.array(z.string()),
  conditions: z.array(z.string()),
  briefSummary: z.string().optional(),
  eligibilityCriteria: z.string().optional(),
  locations: z.array(trialLocationSchema),
  nearestLocation: trialLocationSchema.optional(),
  sourceUrl: z.string(),
  lastUpdated: z.string().optional(),
  rawSource: z.unknown().optional()
});

const trialSearchPaginationBaseSchema = z.object({
  pageSize: z.number().int().positive(),
  sourceRecordsScanned: z.number().int().nonnegative(),
  sourceTotalCount: z.number().int().nonnegative().optional(),
  orderingPolicy: z.string()
});

const trialSearchPaginationSchema = z.discriminatedUnion("hasNextPage", [
  trialSearchPaginationBaseSchema.extend({
    hasNextPage: z.literal(true),
    nextCursor: z.string().min(1)
  }),
  trialSearchPaginationBaseSchema.extend({
    hasNextPage: z.literal(false),
    nextCursor: z.string().min(1).optional()
  })
]);

export const trialSearchMetadataSchema = z.object({
  source: z.literal("ClinicalTrials.gov"),
  sourceStatus: z.literal("live"),
  origin: z.object({
    label: z.string(),
    latitude: z.number(),
    longitude: z.number()
  }),
  radiusMiles: z.number(),
  appliedFilters: z.array(z.string()),
  fetchedAt: z.string(),
  pagination: trialSearchPaginationSchema
});

export const trialSearchResultSchema = z.object({
  trials: z.array(trialRecordSchema),
  metadata: trialSearchMetadataSchema
});

import { NextRequest, NextResponse } from "next/server";
import { ClinicalTrialsError, searchTrials } from "@/lib/clinical-trials";
import { searchCriteriaSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const cursor = params.get("cursor") || undefined;

  if (cursor && !/^[A-Za-z0-9_-]{1,512}$/.test(cursor)) {
    return NextResponse.json(
      { error: "The search page cursor is invalid. Start the search again." },
      { status: 400 }
    );
  }

  const parsed = searchCriteriaSchema.safeParse({
    cancerType: params.get("cancerType"),
    stage: params.get("stage") || undefined,
    biomarkers: params.get("biomarkers") || undefined,
    priorTreatments: params.get("priorTreatments") || undefined,
    ageGroup: params.get("ageGroup"),
    location: params.get("location"),
    radius: params.get("radius"),
    status: params.getAll("status"),
    phase: params.get("phase") || undefined
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Search criteria could not be validated." },
      { status: 400 }
    );
  }

  try {
    return NextResponse.json(await searchTrials(parsed.data, { cursor }));
  } catch (error) {
    const isLocationError =
      error instanceof ClinicalTrialsError && error.status === 422;
    const isCursorError =
      Boolean(cursor) && error instanceof ClinicalTrialsError && error.status === 400;

    return NextResponse.json(
      {
        error: isLocationError
          ? error.message
          : isCursorError
            ? "This results-page link has expired. Start the search again."
          : "ClinicalTrials.gov is temporarily unavailable. No substitute records were shown."
      },
      { status: isLocationError ? 422 : isCursorError ? 400 : 503 }
    );
  }
}

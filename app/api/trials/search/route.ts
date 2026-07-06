import { NextRequest, NextResponse } from "next/server";
import { searchTrials } from "@/lib/clinical-trials";
import { searchCriteriaSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const parsed = searchCriteriaSchema.safeParse({
    cancerType: params.get("cancerType"),
    stage: params.get("stage") || undefined,
    biomarkers: params.get("biomarkers") || undefined,
    priorTreatments: params.get("priorTreatments") || undefined,
    ageGroup: params.get("ageGroup"),
    location: params.get("location"),
    radius: params.get("radius"),
    status: params.getAll("status"),
    phase: params.get("phase") || undefined,
    willingnessToTravel: params.get("willingnessToTravel") || undefined
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Search criteria could not be validated." },
      { status: 400 }
    );
  }

  const trials = await searchTrials(parsed.data);
  return NextResponse.json({ trials });
}

import { NextRequest, NextResponse } from "next/server";
import { getTrialByNctId } from "@/lib/clinical-trials";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ nctId: string }> }
) {
  const { nctId } = await params;
  if (!/^NCT\d{8}$/.test(nctId)) {
    return NextResponse.json({ error: "Invalid NCT ID." }, { status: 400 });
  }

  let trial;
  try {
    trial = await getTrialByNctId(nctId);
  } catch {
    return NextResponse.json(
      { error: "ClinicalTrials.gov is temporarily unavailable." },
      { status: 503 }
    );
  }

  if (!trial) {
    return NextResponse.json({ error: "Trial not found." }, { status: 404 });
  }

  return NextResponse.json({ trial });
}

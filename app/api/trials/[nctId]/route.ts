import { NextRequest, NextResponse } from "next/server";
import { getTrialByNctId } from "@/lib/clinical-trials";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ nctId: string }> }
) {
  const { nctId } = await params;
  const trial = await getTrialByNctId(nctId);

  if (!trial) {
    return NextResponse.json({ error: "Trial not found." }, { status: 404 });
  }

  return NextResponse.json({ trial });
}

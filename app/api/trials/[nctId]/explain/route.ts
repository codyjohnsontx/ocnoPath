import { NextRequest, NextResponse } from "next/server";
import { explainTrial } from "@/lib/explanation";
import { trialRecordSchema } from "@/lib/validation";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ nctId: string }> }
) {
  const { nctId } = await params;
  const body = await request.json();
  const parsed = trialRecordSchema.safeParse(body.trial);

  if (!parsed.success || parsed.data.nctId !== nctId) {
    return NextResponse.json(
      { error: "Trial record could not be validated." },
      { status: 400 }
    );
  }

  const explanation = await explainTrial(parsed.data, body.searchContext);
  return NextResponse.json({ explanation });
}

import { NextRequest, NextResponse } from "next/server";

const CLOB_URL = "https://clob.polymarket.com";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const conditionId = searchParams.get("id");
  if (!conditionId) {
    return NextResponse.json({ error: "Missing id param" }, { status: 400 });
  }

  try {
    const res = await fetch(`${CLOB_URL}/markets/${conditionId}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      return NextResponse.json({ error: `CLOB error ${res.status}` }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

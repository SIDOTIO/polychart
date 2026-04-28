import { NextRequest, NextResponse } from "next/server";

const GAMMA_URL = "https://gamma-api.polymarket.com";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const qs = searchParams.toString();

  try {
    const res = await fetch(`${GAMMA_URL}/markets?${qs}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 30 },
    });
    if (!res.ok) {
      return NextResponse.json({ error: `Gamma API error ${res.status}` }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

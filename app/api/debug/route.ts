import { NextRequest, NextResponse } from "next/server";

// Debug route — returns raw Gamma API response so we can inspect the shape
// Visit: http://localhost:3000/api/debug?q=trump
export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get("q") ?? "trump";

  const [searchRes, popularRes] = await Promise.all([
    fetch(`https://gamma-api.polymarket.com/markets?search=${encodeURIComponent(q)}&active=true&closed=false&limit=2`),
    fetch(`https://gamma-api.polymarket.com/markets?active=true&closed=false&order=volume24hr&ascending=false&limit=2`),
  ]);

  const search = searchRes.ok ? await searchRes.json() : { error: searchRes.status };
  const popular = popularRes.ok ? await popularRes.json() : { error: popularRes.status };

  // Show just the keys + first item shape so we can see structure without wall of text
  const firstSearch = Array.isArray(search) ? search[0] : (search?.data?.[0] ?? search);
  const firstPopular = Array.isArray(popular) ? popular[0] : (popular?.data?.[0] ?? popular);

  return NextResponse.json({
    searchIsArray: Array.isArray(search),
    searchLength: Array.isArray(search) ? search.length : null,
    searchFirstItemKeys: firstSearch ? Object.keys(firstSearch) : null,
    searchFirstItem: firstSearch,
    popularIsArray: Array.isArray(popular),
    popularLength: Array.isArray(popular) ? popular.length : null,
    popularFirstItemKeys: firstPopular ? Object.keys(firstPopular) : null,
    popularFirstItem: firstPopular,
  }, { headers: { "Content-Type": "application/json" } });
}

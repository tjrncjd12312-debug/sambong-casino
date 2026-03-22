import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// 이미지 캐시 (메모리)
const imageCache = new Map<string, { data: Buffer; contentType: string; timestamp: number }>();
const CACHE_DURATION = 60 * 60 * 1000; // 1시간

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get("url");
    if (!url) {
      return NextResponse.json({ error: "URL required" }, { status: 400 });
    }

    // 허용된 도메인만
    const allowed = ["thumbnails.honorlink.org", "media.gji5nhz8849dk32iifjuwegjeigkoskof.site", "img.dyn123.com"];
    const parsed = new URL(url);
    if (!allowed.some(d => parsed.hostname.includes(d))) {
      return NextResponse.json({ error: "Domain not allowed" }, { status: 403 });
    }

    // 캐시 확인
    const cached = imageCache.get(url);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return new NextResponse(cached.data, {
        headers: {
          "Content-Type": cached.contentType,
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    const res = await fetch(url, {
      headers: { "Referer": "https://honorlink.org" },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Image fetch failed" }, { status: res.status });
    }

    const contentType = res.headers.get("content-type") || "image/png";
    const buffer = Buffer.from(await res.arrayBuffer());

    // 캐시 저장
    imageCache.set(url, { data: buffer, contentType, timestamp: Date.now() });

    // 캐시 크기 제한 (최대 200개)
    if (imageCache.size > 200) {
      const oldest = [...imageCache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
      if (oldest) imageCache.delete(oldest[0]);
    }

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Proxy error" }, { status: 500 });
  }
}

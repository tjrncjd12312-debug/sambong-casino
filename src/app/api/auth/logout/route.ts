import { NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ success: true });

  // Admin token 삭제
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  // Member token 삭제
  response.cookies.set("member_token", "", {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  return response;
}

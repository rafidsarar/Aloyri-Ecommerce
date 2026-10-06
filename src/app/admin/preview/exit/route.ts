import { draftMode } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const preview = await draftMode();
  preview.disable();
  return NextResponse.redirect(new URL("/admin/publishing", request.url));
}

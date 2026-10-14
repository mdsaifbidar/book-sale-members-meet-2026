import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/guard";
import { searchBooks } from "@/lib/data/books";

export async function GET(request: NextRequest) {
  await requireUser();

  const query = request.nextUrl.searchParams.get("q") ?? "";
  const books = await searchBooks(query);
  return NextResponse.json({ books });
}

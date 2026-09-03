import { NextRequest, NextResponse } from 'next/server';

import { apiFetchForm } from '@/lib/session';

/**
 * Multipart passthrough for file uploads. The generic `[...path]` proxy reads the
 * body as text, which corrupts binary payloads, so uploads get their own handler
 * that forwards the raw bytes and the original multipart boundary untouched.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const category = request.nextUrl.searchParams.get('category') ?? 'OTHER';
  const contentType = request.headers.get('content-type') ?? undefined;
  const body = await request.arrayBuffer();

  const result = await apiFetchForm<unknown>(
    `/files/upload?category=${encodeURIComponent(category)}`,
    body,
    contentType,
  );

  if (result.error) {
    return NextResponse.json({ message: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data, { status: result.status });
}

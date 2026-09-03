import { NextRequest, NextResponse } from 'next/server';

import { apiFetchText } from '@/lib/session';

export async function GET(
  request: NextRequest,
  context: { params: { key: string } },
): Promise<NextResponse> {
  const result = await apiFetchText(`/reports/${context.params.key}/export${request.nextUrl.search}`);
  if (result.body === null) {
    return NextResponse.json({ message: result.error }, { status: result.status });
  }
  return new NextResponse(result.body, {
    status: 200,
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="gridx-${context.params.key}.csv"`,
    },
  });
}

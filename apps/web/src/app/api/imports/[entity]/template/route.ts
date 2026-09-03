import { NextRequest, NextResponse } from 'next/server';

import { apiFetchText } from '@/lib/session';

/**
 * The empty CSV a person fills in before a bulk import. It needs its own route because the generic
 * /api/gridx proxy wraps every response as JSON, and this one is a file.
 */
export async function GET(
  _request: NextRequest,
  context: { params: { entity: string } },
): Promise<NextResponse> {
  const result = await apiFetchText(`/imports/${context.params.entity}/template`);
  if (result.body === null) {
    return NextResponse.json({ message: result.error }, { status: result.status });
  }
  return new NextResponse(result.body, {
    status: 200,
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="gridx-${context.params.entity}-template.csv"`,
    },
  });
}

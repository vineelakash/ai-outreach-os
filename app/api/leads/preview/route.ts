import { NextRequest, NextResponse } from 'next/server';
import { parseAndPreviewCsv } from '@/lib/leads/csv-importer';
import { z } from 'zod';

const PreviewCsvSchema = z.object({
  csvContent: z.string().min(5),
  mapping: z.object({
    email: z.string().min(1),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    fullName: z.string().optional(),
    company: z.string().optional(),
    jobTitle: z.string().optional(),
  }),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = PreviewCsvSchema.parse(body);

    const preview = parseAndPreviewCsv(data.csvContent, data.mapping as any);
    return NextResponse.json(preview);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to preview CSV' }, { status: 400 });
  }
}

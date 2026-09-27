import { NextRequest, NextResponse } from 'next/server';
import { executeCsvImport, parseAndPreviewCsv } from '@/lib/leads/csv-importer';
import { z } from 'zod';

const ImportCsvSchema = z.object({
  organizationId: z.string(),
  csvContent: z.string().min(5),
  mapping: z.object({
    email: z.string().min(1),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    fullName: z.string().optional(),
    company: z.string().optional(),
    jobTitle: z.string().optional(),
    phone: z.string().optional(),
    website: z.string().optional(),
    linkedinUrl: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    industry: z.string().optional(),
  }),
  campaignId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = ImportCsvSchema.parse(body);

    const summary = await executeCsvImport(
      data.organizationId,
      data.csvContent,
      data.mapping,
      data.campaignId
    );

    return NextResponse.json({ summary });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to import CSV' }, { status: 400 });
  }
}

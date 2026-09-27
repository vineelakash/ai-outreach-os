import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

const CreateLeadSchema = z.object({
  email: z.string().email(),
  organizationId: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  linkedinUrl: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  industry: z.string().optional(),
  customFields: z.record(z.unknown()).optional(),
  campaignId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('organizationId');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (orgId) where.organizationId = orgId;
    if (status && status !== 'ALL') where.status = status;
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, leads] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.findMany({
        where,
        take: limit,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          campaignLeads: {
            include: { campaign: { select: { id: true, name: true } } },
          },
        },
      }),
    ]);

    return NextResponse.json({
      leads,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch leads' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = CreateLeadSchema.parse(body);

    const lead = await prisma.lead.create({
      data: {
        email: data.email.toLowerCase().trim(),
        organizationId: data.organizationId,
        firstName: data.firstName,
        lastName: data.lastName,
        fullName: [data.firstName, data.lastName].filter(Boolean).join(' ') || undefined,
        company: data.company,
        jobTitle: data.jobTitle,
        phone: data.phone,
        website: data.website,
        linkedinUrl: data.linkedinUrl,
        city: data.city,
        state: data.state,
        country: data.country,
        industry: data.industry,
        customFields: (data.customFields as any) || {},
        status: 'NEW',
      },
    });

    if (data.campaignId) {
      await prisma.campaignLead.create({
        data: {
          campaignId: data.campaignId,
          leadId: lead.id,
          status: 'QUEUED',
          currentStep: 1,
          nextRunAt: new Date(),
        },
      });
    }

    return NextResponse.json({ lead }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create lead' }, { status: 400 });
  }
}

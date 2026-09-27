import Papa from 'papaparse';
import { prisma } from '@/lib/db/prisma';

export interface ColumnMapping {
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  company?: string;
  jobTitle?: string;
  phone?: string;
  website?: string;
  linkedinUrl?: string;
  city?: string;
  state?: string;
  country?: string;
  industry?: string;
}

export interface ImportPreviewRow {
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  jobTitle?: string;
  isValidEmail: boolean;
  validationError?: string;
}

export interface ImportSummary {
  totalRows: number;
  validRows: number;
  imported: number;
  duplicates: number;
  invalidEmails: number;
  suppressed: number;
}

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function parseAndPreviewCsv(
  csvContent: string,
  mapping: ColumnMapping
): { previewRows: ImportPreviewRow[]; headers: string[]; totalDetected: number } {
  const parsed = Papa.parse<Record<string, string>>(csvContent, {
    header: true,
    skipEmptyLines: true,
  });

  const headers = parsed.meta.fields || [];
  const previewRows: ImportPreviewRow[] = [];

  for (const row of parsed.data.slice(0, 50)) {
    const rawEmail = row[mapping.email]?.trim() || '';
    const isValid = EMAIL_REGEX.test(rawEmail);

    previewRows.push({
      email: rawEmail,
      firstName: mapping.firstName ? row[mapping.firstName]?.trim() : undefined,
      lastName: mapping.lastName ? row[mapping.lastName]?.trim() : undefined,
      company: mapping.company ? row[mapping.company]?.trim() : undefined,
      jobTitle: mapping.jobTitle ? row[mapping.jobTitle]?.trim() : undefined,
      isValidEmail: isValid,
      validationError: !isValid ? 'Invalid email format' : undefined,
    });
  }

  return {
    previewRows,
    headers,
    totalDetected: parsed.data.length,
  };
}

export async function executeCsvImport(
  organizationId: string,
  csvContent: string,
  mapping: ColumnMapping,
  campaignId?: string
): Promise<ImportSummary> {
  const parsed = Papa.parse<Record<string, string>>(csvContent, {
    header: true,
    skipEmptyLines: true,
  });

  const summary: ImportSummary = {
    totalRows: parsed.data.length,
    validRows: 0,
    imported: 0,
    duplicates: 0,
    invalidEmails: 0,
    suppressed: 0,
  };

  const seenInBatch = new Set<string>();
  const toUpsert: Array<{
    organizationId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    company?: string;
    jobTitle?: string;
    phone?: string;
    website?: string;
    linkedinUrl?: string;
    city?: string;
    state?: string;
    country?: string;
    industry?: string;
    customFields: Record<string, string>;
  }> = [];

  for (const row of parsed.data) {
    const rawEmail = row[mapping.email]?.trim().toLowerCase() || '';

    if (!rawEmail || !EMAIL_REGEX.test(rawEmail)) {
      summary.invalidEmails++;
      continue;
    }

    if (seenInBatch.has(rawEmail)) {
      summary.duplicates++;
      continue;
    }
    seenInBatch.add(rawEmail);
    summary.validRows++;

    // Extract custom fields that are not in explicit mapping
    const customFields: Record<string, string> = {};
    for (const [key, val] of Object.entries(row)) {
      if (!Object.values(mapping).includes(key) && val) {
        customFields[key] = val;
      }
    }

    toUpsert.push({
      organizationId,
      email: rawEmail,
      firstName: mapping.firstName ? row[mapping.firstName]?.trim() : undefined,
      lastName: mapping.lastName ? row[mapping.lastName]?.trim() : undefined,
      fullName: mapping.fullName
        ? row[mapping.fullName]?.trim()
        : [mapping.firstName ? row[mapping.firstName]?.trim() : '', mapping.lastName ? row[mapping.lastName]?.trim() : '']
            .filter(Boolean)
            .join(' ') || undefined,
      company: mapping.company ? row[mapping.company]?.trim() : undefined,
      jobTitle: mapping.jobTitle ? row[mapping.jobTitle]?.trim() : undefined,
      phone: mapping.phone ? row[mapping.phone]?.trim() : undefined,
      website: mapping.website ? row[mapping.website]?.trim() : undefined,
      linkedinUrl: mapping.linkedinUrl ? row[mapping.linkedinUrl]?.trim() : undefined,
      city: mapping.city ? row[mapping.city]?.trim() : undefined,
      state: mapping.state ? row[mapping.state]?.trim() : undefined,
      country: mapping.country ? row[mapping.country]?.trim() : undefined,
      industry: mapping.industry ? row[mapping.industry]?.trim() : undefined,
      customFields,
    });
  }

  // Check global suppression in DB
  const emailsToCheck = toUpsert.map((item) => item.email);
  const existingSuppressed = await prisma.lead.findMany({
    where: {
      organizationId,
      email: { in: emailsToCheck },
      OR: [{ unsubscribed: true }, { bounced: true }, { status: 'DO_NOT_CONTACT' }],
    },
    select: { email: true },
  });

  const suppressedSet = new Set(existingSuppressed.map((l) => l.email));

  for (const item of toUpsert) {
    if (suppressedSet.has(item.email)) {
      summary.suppressed++;
      continue;
    }

    try {
      const lead = await prisma.lead.upsert({
        where: {
          organizationId_email: {
            organizationId,
            email: item.email,
          },
        },
        create: {
          organizationId,
          email: item.email,
          firstName: item.firstName,
          lastName: item.lastName,
          fullName: item.fullName,
          company: item.company,
          jobTitle: item.jobTitle,
          phone: item.phone,
          website: item.website,
          linkedinUrl: item.linkedinUrl,
          city: item.city,
          state: item.state,
          country: item.country,
          industry: item.industry,
          customFields: item.customFields,
          status: 'NEW',
        },
        update: {
          firstName: item.firstName,
          lastName: item.lastName,
          fullName: item.fullName,
          company: item.company,
          jobTitle: item.jobTitle,
        },
      });

      // If imported for a specific campaign, link it
      if (campaignId) {
        await prisma.campaignLead.upsert({
          where: {
            campaignId_leadId: {
              campaignId,
              leadId: lead.id,
            },
          },
          create: {
            campaignId,
            leadId: lead.id,
            status: 'QUEUED',
            currentStep: 1,
            nextRunAt: new Date(),
          },
          update: {},
        });
      }

      summary.imported++;
    } catch (err) {
      console.error(`[LEAD_IMPORT_ROW_ERROR] ${item.email}`, err);
    }
  }

  return summary;
}

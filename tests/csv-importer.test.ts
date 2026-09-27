import { describe, it, expect } from 'vitest';
import { parseAndPreviewCsv } from '@/lib/leads/csv-importer';

describe('CSV Lead Importer', () => {
  const sampleCsv = `First Name,Last Name,Email,Company,Title
John,Doe,john.doe@example.com,Example Corp,CEO
Jane,Smith,jane.smith@tech.io,Tech Systems,CTO
Invalid,User,not-an-email,Bad Corp,VP
Duplicate,User,john.doe@example.com,Example Corp,Manager`;

  it('should parse CSV and map columns accurately', () => {
    const preview = parseAndPreviewCsv(sampleCsv, {
      email: 'Email',
      firstName: 'First Name',
      lastName: 'Last Name',
      company: 'Company',
      jobTitle: 'Title',
    });

    expect(preview.headers).toEqual(['First Name', 'Last Name', 'Email', 'Company', 'Title']);
    expect(preview.previewRows.length).toBe(4);

    const validRow = preview.previewRows.find((r) => r.email === 'john.doe@example.com');
    expect(validRow?.isValidEmail).toBe(true);
    expect(validRow?.company).toBe('Example Corp');

    const invalidRow = preview.previewRows.find((r) => r.email === 'not-an-email');
    expect(invalidRow?.isValidEmail).toBe(false);
    expect(invalidRow?.validationError).toBe('Invalid email format');
  });
});

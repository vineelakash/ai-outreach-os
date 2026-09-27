import { promises as dns } from 'dns';

export interface DnsCheckResult {
  domain: string;
  spf: {
    valid: boolean;
    record?: string;
    details: string;
  };
  dkim: {
    valid: boolean;
    record?: string;
    selectorTested: string;
    details: string;
  };
  dmarc: {
    valid: boolean;
    record?: string;
    policy?: 'none' | 'quarantine' | 'reject';
    details: string;
  };
  healthScore: number; // 0 to 100
  healthStatus: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'UNVERIFIED';
  recommendations: string[];
}

export async function checkDomainDns(
  domainName: string,
  dkimSelector: string = 'google'
): Promise<DnsCheckResult> {
  const cleanDomain = domainName.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const recommendations: string[] = [];
  let score = 0;

  // 1. Check SPF Record
  let spfValid = false;
  let spfRecord: string | undefined;
  let spfDetails = 'No valid SPF record found.';
  try {
    const txtRecords = await dns.resolveTxt(cleanDomain);
    const flat = txtRecords.map((chunk) => chunk.join(''));
    const foundSpf = flat.find((r) => r.startsWith('v=spf1'));

    if (foundSpf) {
      spfRecord = foundSpf;
      spfValid = true;
      spfDetails = 'SPF record detected and active.';
      score += 35;
    } else {
      recommendations.push(`Add an SPF record TXT on @: "v=spf1 include:_spf.google.com ~all"`);
    }
  } catch (err: unknown) {
    spfDetails = `DNS query failed: ${err instanceof Error ? err.message : String(err)}`;
    recommendations.push('Verify domain has active nameservers and DNS records.');
  }

  // 2. Check DKIM Record
  let dkimValid = false;
  let dkimRecord: string | undefined;
  let dkimDetails = `No DKIM record detected on selector "${dkimSelector}".`;
  const selectorCandidates = [dkimSelector, 'google', 'default', 'k1', 'smtp'];

  for (const sel of selectorCandidates) {
    const dkimHost = `${sel}._domainkey.${cleanDomain}`;
    try {
      const records = await dns.resolveTxt(dkimHost);
      const flat = records.map((chunk) => chunk.join(''));
      const foundDkim = flat.find((r) => r.includes('v=DKIM1') || r.includes('p='));
      if (foundDkim) {
        dkimValid = true;
        dkimRecord = foundDkim;
        dkimDetails = `DKIM verified on selector "${sel}".`;
        score += 35;
        break;
      }
    } catch {
      // Continue checking next selector candidate
    }
  }

  if (!dkimValid) {
    recommendations.push(`Configure DKIM TXT record at ${dkimSelector}._domainkey.${cleanDomain}`);
  }

  // 3. Check DMARC Record
  let dmarcValid = false;
  let dmarcRecord: string | undefined;
  let dmarcPolicy: 'none' | 'quarantine' | 'reject' | undefined;
  let dmarcDetails = 'No DMARC record found.';

  try {
    const dmarcHost = `_dmarc.${cleanDomain}`;
    const txtRecords = await dns.resolveTxt(dmarcHost);
    const flat = txtRecords.map((chunk) => chunk.join(''));
    const foundDmarc = flat.find((r) => r.startsWith('v=DMARC1'));

    if (foundDmarc) {
      dmarcRecord = foundDmarc;
      dmarcValid = true;
      score += 20;

      if (foundDmarc.includes('p=reject')) {
        dmarcPolicy = 'reject';
        score += 10;
        dmarcDetails = 'Strict DMARC policy (p=reject) active.';
      } else if (foundDmarc.includes('p=quarantine')) {
        dmarcPolicy = 'quarantine';
        score += 8;
        dmarcDetails = 'Quarantine DMARC policy (p=quarantine) active.';
      } else {
        dmarcPolicy = 'none';
        score += 5;
        dmarcDetails = 'DMARC policy is currently set to monitoring (p=none).';
        recommendations.push('Upgrade DMARC policy to p=quarantine or p=reject once deliverability is warm.');
      }
    } else {
      recommendations.push(`Add a DMARC record TXT on _dmarc: "v=DMARC1; p=none; rua=mailto:dmarc@${cleanDomain}"`);
    }
  } catch {
    dmarcDetails = 'No DMARC record found at _dmarc.' + cleanDomain;
    recommendations.push(`Add a DMARC record TXT at _dmarc.${cleanDomain}`);
  }

  // Categorize health score
  let healthStatus: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'UNVERIFIED' = 'UNVERIFIED';
  if (score >= 90) healthStatus = 'EXCELLENT';
  else if (score >= 70) healthStatus = 'GOOD';
  else if (score >= 40) healthStatus = 'FAIR';
  else if (score > 0) healthStatus = 'POOR';

  return {
    domain: cleanDomain,
    spf: { valid: spfValid, record: spfRecord, details: spfDetails },
    dkim: { valid: dkimValid, record: dkimRecord, selectorTested: dkimSelector, details: dkimDetails },
    dmarc: { valid: dmarcValid, record: dmarcRecord, policy: dmarcPolicy, details: dmarcDetails },
    healthScore: Math.min(100, score),
    healthStatus,
    recommendations,
  };
}

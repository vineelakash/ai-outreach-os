import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { encrypt } from '../lib/security/crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding demo data for AI Outreach OS...');

  // 1. Create Demo Organization
  const org = await prisma.organization.create({
    data: {
      name: 'Acme Growth Labs [DEMO]',
    },
  });

  // 2. Create Demo User
  const passwordHash = await bcrypt.hash('password123', 10);
  const user = await prisma.user.create({
    data: {
      name: 'Alex Johnson [DEMO]',
      email: 'demo@outreach-os.local',
      passwordHash,
      memberships: {
        create: {
          organizationId: org.id,
          role: 'OWNER',
        },
      },
    },
  });

  console.log(`✔ Created demo user: ${user.email} (Password: password123)`);

  // 3. Create Demo Domain with Verified DNS
  const domain = await prisma.domain.create({
    data: {
      domainName: 'acmegrowthlabs.com',
      organizationId: org.id,
      spfRecord: 'v=spf1 include:_spf.google.com ~all',
      spfStatus: true,
      dkimRecord: 'v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQ...',
      dkimStatus: true,
      dmarcRecord: 'v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarc@acmegrowthlabs.com',
      dmarcStatus: true,
      healthScore: 94,
      healthStatus: 'EXCELLENT',
      lastCheckedAt: new Date(),
    },
  });

  // 4. Create Demo Mailboxes
  const mockSmtpCreds = JSON.stringify({
    smtpHost: 'smtp.mailtrap.io',
    smtpPort: 587,
    smtpUser: 'demo-user',
    smtpPass: 'demo-pass',
    imapHost: 'imap.mailtrap.io',
    imapPort: 993,
    imapUser: 'demo-user',
    imapPass: 'demo-pass',
  });

  const mailbox1 = await prisma.mailbox.create({
    data: {
      email: 'alex@acmegrowthlabs.com',
      displayName: 'Alex Johnson',
      providerType: 'SMTP_IMAP',
      organizationId: org.id,
      domainId: domain.id,
      encryptedCredentials: encrypt(mockSmtpCreds),
      dailyLimit: 75,
      currentDaySent: 18,
      totalSent: 142,
      totalReplies: 24,
      totalBounces: 2,
      status: 'ACTIVE',
    },
  });

  const mailbox2 = await prisma.mailbox.create({
    data: {
      email: 'sarah.growth@acmegrowthlabs.com',
      displayName: 'Sarah Davis',
      providerType: 'GMAIL',
      organizationId: org.id,
      domainId: domain.id,
      encryptedCredentials: encrypt(JSON.stringify({ clientId: 'mock', clientSecret: 'mock', refreshToken: 'mock' })),
      dailyLimit: 60,
      currentDaySent: 12,
      totalSent: 98,
      totalReplies: 17,
      totalBounces: 1,
      status: 'ACTIVE',
    },
  });

  // 5. Create Demo AI Provider Config
  await prisma.aIProviderConfig.create({
    data: {
      organizationId: org.id,
      provider: 'OPENAI',
      encryptedApiKey: encrypt('sk-mock-demo-key-for-local-seeding'),
      defaultModel: 'gpt-4o-mini',
      isEnabled: true,
      tokensUsed: 4210,
      costEstimated: 0.12,
    },
  });

  // 6. Create Demo Campaign
  const campaign = await prisma.campaign.create({
    data: {
      name: 'Q3 Enterprise Outbound [DEMO]',
      description: 'Outbound sales sequence targeting VP of Sales and Heads of Revenue.',
      status: 'ACTIVE',
      organizationId: org.id,
      timezone: 'America/New_York',
      startHour: 9,
      endHour: 17,
      allowedDays: [1, 2, 3, 4, 5],
      dailyLimit: 100,
      replyAutomationMode: 'SEMI_AUTOMATIC',
      stopOnReply: true,
      stopOnBounce: true,
      trackOpens: true,
      trackClicks: true,
      aiProvider: 'OPENAI',
      aiModel: 'gpt-4o-mini',
      campaignMailboxes: {
        create: [
          { mailboxId: mailbox1.id },
          { mailboxId: mailbox2.id },
        ],
      },
      sequences: {
        create: {
          steps: {
            create: [
              {
                stepNumber: 1,
                delayDays: 0,
                subject: 'Streamlining outbound delivery for {{company}}',
                body: 'Hi {{firstName}},\n\nI noticed your work as {{jobTitle}} at {{company}}. Most revenue teams we speak with face deliverability bottlenecks when scaling cold outreach.\n\nWe built an automated system that handles DNS health, rotation, and AI replies in a single platform.\n\nWould you be open to a 10-minute chat this Thursday?\n\nBest,\n{{senderName}}',
                enableAiPersonalize: true,
              },
              {
                stepNumber: 2,
                delayDays: 3,
                subject: 'Re: Streamlining outbound delivery for {{company}}',
                body: 'Hi {{firstName}},\n\nFollowing up on my previous note. Thought you might find value in how similar teams in {{industry}} boosted reply rates by 2.4x while maintaining sub-1% bounce rates.\n\nHappy to share a quick breakdown if useful.\n\nBest,\n{{senderName}}',
                enableAiPersonalize: false,
              },
              {
                stepNumber: 3,
                delayDays: 4,
                subject: 'Quick closeout - {{company}}',
                body: 'Hi {{firstName}},\n\nI assume this is not high priority for {{company}} right now. If things change, feel free to reach back out.\n\nBest,\n{{senderName}}',
                enableAiPersonalize: false,
              },
            ],
          },
        },
      },
    },
  });

  // 7. Create Demo Leads
  const leadsData = [
    {
      firstName: 'David',
      lastName: 'Chen',
      email: 'david.chen@fintechpulse.io',
      company: 'Fintech Pulse',
      jobTitle: 'VP of Growth',
      industry: 'Fintech',
      city: 'San Francisco',
      status: 'INTERESTED' as const,
    },
    {
      firstName: 'Elena',
      lastName: 'Rostova',
      email: 'elena@cloudscale.net',
      company: 'CloudScale Systems',
      jobTitle: 'Head of Sales',
      industry: 'Cloud Infrastructure',
      city: 'Austin',
      status: 'MEETING_BOOKED' as const,
    },
    {
      firstName: 'Marcus',
      lastName: 'Brody',
      email: 'marcus@dentallogic.com',
      company: 'DentalLogic',
      jobTitle: 'Managing Partner',
      industry: 'Healthcare',
      city: 'Chicago',
      status: 'REPLIED' as const,
    },
    {
      firstName: 'Samantha',
      lastName: 'Miller',
      email: 'smiller@apexretail.co',
      company: 'Apex Retail',
      jobTitle: 'Chief Commercial Officer',
      industry: 'E-Commerce',
      city: 'New York',
      status: 'CONTACTED' as const,
    },
    {
      firstName: 'Jason',
      lastName: 'Taylor',
      email: 'jason@taylorconsulting.org',
      company: 'Taylor Consulting',
      jobTitle: 'Principal',
      industry: 'Management Consulting',
      city: 'Boston',
      status: 'QUEUED' as const,
    },
  ];

  for (const item of leadsData) {
    const lead = await prisma.lead.create({
      data: {
        organizationId: org.id,
        email: item.email,
        firstName: item.firstName,
        lastName: item.lastName,
        fullName: `${item.firstName} ${item.lastName}`,
        company: item.company,
        jobTitle: item.jobTitle,
        industry: item.industry,
        city: item.city,
        status: item.status,
      },
    });

    await prisma.campaignLead.create({
      data: {
        campaignId: campaign.id,
        leadId: lead.id,
        status: item.status,
        currentStep: item.status === 'QUEUED' ? 1 : 2,
        lastSentAt: item.status !== 'QUEUED' ? new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) : null,
      },
    });

    // Create Conversation Thread for Replied/Interested leads
    if (['INTERESTED', 'MEETING_BOOKED', 'REPLIED'].includes(item.status)) {
      const thread = await prisma.emailThread.create({
        data: {
          campaignId: campaign.id,
          mailboxId: mailbox1.id,
          leadId: lead.id,
          subject: `Streamlining outbound delivery for ${item.company}`,
          snippet: item.status === 'INTERESTED' ? 'Sounds very interesting, could you share a deck or link?' : 'Let us connect tomorrow at 2 PM.',
          hasUnread: item.status === 'INTERESTED',
          latestIntent: item.status === 'INTERESTED' ? 'INTERESTED' : item.status === 'MEETING_BOOKED' ? 'MEETING_REQUEST' : 'QUESTION',
        },
      });

      // Outbound message 1
      await prisma.emailMessage.create({
        data: {
          threadId: thread.id,
          mailboxId: mailbox1.id,
          fromEmail: mailbox1.email,
          fromName: mailbox1.displayName,
          toEmail: lead.email,
          subject: thread.subject,
          bodyText: `Hi ${item.firstName},\n\nI noticed your work as ${item.jobTitle} at ${item.company}. Would you be open to a 10-minute chat this Thursday?`,
          isOutbound: true,
          sentAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
        },
      });

      // Inbound reply
      const replyBody =
        item.status === 'INTERESTED'
          ? 'Hi Alex,\n\nThanks for reaching out. We are actually evaluating deliverability tools right now. Can you send over a brief deck or pricing overview?\n\nBest,\n' + item.firstName
          : 'Hi Alex,\n\nSounds relevant. Would tomorrow afternoon at 2 PM EST work for a brief demo?\n\nThanks,\n' + item.firstName;

      await prisma.emailMessage.create({
        data: {
          threadId: thread.id,
          mailboxId: mailbox1.id,
          fromEmail: lead.email,
          fromName: lead.fullName,
          toEmail: mailbox1.email,
          subject: `Re: ${thread.subject}`,
          bodyText: replyBody,
          isOutbound: false,
          sentAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
        },
      });

      // AI Classification
      await prisma.replyClassification.create({
        data: {
          threadId: thread.id,
          intent: (item.status === 'INTERESTED' ? 'INTERESTED' : 'MEETING_REQUEST') as any,
          confidence: 0.96,
          summary: item.status === 'INTERESTED' ? 'Lead requested product deck and pricing overview.' : 'Lead proposed tomorrow at 2 PM EST for demo.',
          recommendedAction: item.status === 'INTERESTED' ? 'SEND_PRICING_AND_DECK' : 'CONFIRM_CALENDAR_SLOT',
          draftReply: item.status === 'INTERESTED'
            ? `Hi ${item.firstName},\n\nGlad to hear from you! I've attached our quick product overview and pricing breakdown. Does tomorrow at 2 PM EST work to walk through questions?\n\nBest,\nAlex`
            : `Hi ${item.firstName},\n\nTomorrow at 2 PM EST works perfectly. I've sent over a calendar invite with the Google Meet link.\n\nLooking forward to speaking!\nAlex`,
          autoSent: false,
        },
      });
    }
  }

  console.log('✨ Seed database completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

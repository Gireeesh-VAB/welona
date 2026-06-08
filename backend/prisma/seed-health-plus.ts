import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const customerId = 'cmq0jn0ep00077hv2nwbynsil';
  const orgId = 'default-org'; // Default org ID - adjust if needed

  console.log('Adding test data for Health Plus Solutions...\n');

  // Add Feedback entries
  const feedbackEntries = [
    {
      orgId,
      customerId,
      rating: 5,
      comment: 'Excellent service quality. Very satisfied with the service provided. Professional and timely.',
      relatedTo: 'health consultation',
    },
    {
      orgId,
      customerId,
      rating: 5,
      comment: 'Great customer support. Support team was very helpful and responsive to our inquiries.',
      relatedTo: 'customer service',
    },
    {
      orgId,
      customerId,
      rating: 4,
      comment: 'Good service overall. Minor improvements needed in response time.',
      relatedTo: 'support',
    },
  ];

  for (const entry of feedbackEntries) {
    await db.feedback.create({
      data: entry,
    });
  }
  console.log(`✅ Added ${feedbackEntries.length} feedback entries`);

  // Add Documents
  const documents = [
    {
      orgId,
      customerId,
      title: 'Health Plus Contract 2024',
      docType: 'contract',
      fileUrl: '/documents/contract-2024.pdf',
      notes: 'Service agreement for annual health package',
    },
    {
      orgId,
      customerId,
      title: 'Insurance Certificate',
      docType: 'certificate',
      fileUrl: '/documents/insurance-cert.pdf',
      notes: 'Current insurance coverage document',
    },
    {
      orgId,
      customerId,
      title: 'Service Agreement',
      docType: 'agreement',
      fileUrl: '/documents/service-agreement.pdf',
      notes: 'Terms and conditions for premium services',
    },
    {
      orgId,
      customerId,
      title: 'Invoice INV-2024-0156',
      docType: 'invoice',
      fileUrl: '/documents/invoice-2024-0156.pdf',
      notes: 'Monthly billing statement',
    },
  ];

  for (const doc of documents) {
    await db.document.create({
      data: doc,
    });
  }
  console.log(`✅ Added ${documents.length} documents`);

  console.log('\n✨ Test data added successfully for Health Plus Solutions!');
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());

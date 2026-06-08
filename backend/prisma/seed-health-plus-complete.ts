import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const customerId = 'cmq0jn0ep00077hv2nwbynsil';
  const branchId = 'cmq0jn006000a7hv23qw0n3d2';
  const orgId = 'default-org';

  console.log('Adding comprehensive test data for Health Plus Solutions...\n');

  // ✅ Bookings (already added, adding more)
  const bookings = [
    {
      orgId,
      branchId,
      customerId,
      serviceName: 'Annual Health Checkup',
      status: 'confirmed',
      notes: 'Complete health checkup scheduled',
      scheduledAt: new Date('2024-06-15'),
    },
    {
      orgId,
      branchId,
      customerId,
      serviceName: 'Consultation - General Wellness',
      status: 'completed',
      notes: 'General wellness consultation completed successfully',
      scheduledAt: new Date('2024-05-20'),
    },
    {
      orgId,
      branchId,
      customerId,
      serviceName: 'Blood Work & Lab Tests',
      status: 'pending',
      notes: 'Lab tests appointment scheduled',
      scheduledAt: new Date('2024-06-25'),
    },
    {
      orgId,
      branchId,
      customerId,
      serviceName: 'Follow-up Consultation',
      status: 'confirmed',
      notes: 'Post-checkup follow-up consultation',
      scheduledAt: new Date('2024-07-10'),
    },
  ];

  for (const booking of bookings) {
    await db.booking.create({ data: booking });
  }
  console.log(`✅ Added ${bookings.length} bookings`);

  // ✅ Packages
  const packages = [
    {
      orgId,
      customerId,
      name: 'Premium Health Package',
      price: 500000,
      totalSessions: 4,
      status: 'active',
      notes: 'Comprehensive annual health checkup with lab tests',
    },
    {
      orgId,
      customerId,
      name: 'Wellness Plus Package',
      price: 300000,
      totalSessions: 4,
      status: 'active',
      notes: 'Quarterly health monitoring and consultation',
    },
    {
      orgId,
      customerId,
      name: 'Silver Membership',
      price: 200000,
      totalSessions: 2,
      status: 'active',
      notes: 'Bi-annual checkups and priority support',
    },
  ];

  for (const pkg of packages) {
    await db.package.create({ data: pkg });
  }
  console.log(`✅ Added ${packages.length} packages`);

  // ✅ Offers
  const offers = [
    {
      orgId,
      customerId,
      title: 'Summer Health Special',
      description: 'Get 20% discount on all health packages',
      discountType: 'percentage',
      discountValue: 20,
      validUntil: new Date('2024-08-31'),
    },
    {
      orgId,
      customerId,
      title: 'Referral Bonus',
      description: 'Refer a friend and get ₹500 credit',
      discountType: 'fixed',
      discountValue: 50000,
      validUntil: new Date('2024-12-31'),
    },
    {
      orgId,
      customerId,
      title: 'Loyalty Reward',
      description: 'Free annual checkup for existing members',
      discountType: 'percentage',
      discountValue: 100,
      validUntil: new Date('2024-09-30'),
    },
  ];

  for (const offer of offers) {
    await db.offer.create({ data: offer });
  }
  console.log(`✅ Added ${offers.length} offers`);

  // ✅ Prescriptions
  const prescriptions = [
    {
      orgId,
      customerId,
      medications: 'Vitamin D3 Supplements - 1000 IU - Once daily',
      diagnosis: 'Vitamin D Deficiency',
      notes: 'Take with breakfast. Recheck levels after 3 months',
      issuedAt: new Date('2024-05-20'),
    },
    {
      orgId,
      customerId,
      medications: 'Multivitamin Complex - 1 tablet - Once daily',
      diagnosis: 'General Health Maintenance',
      notes: 'Good for overall wellness. Continue as prescribed',
      issuedAt: new Date('2024-05-20'),
    },
    {
      orgId,
      customerId,
      medications: 'Omega-3 Fish Oil - 2 capsules - Once daily with meals',
      diagnosis: 'Cholesterol Management',
      notes: 'For heart health and cholesterol management',
      issuedAt: new Date('2024-05-25'),
    },
  ];

  for (const prescription of prescriptions) {
    await db.prescription.create({ data: prescription });
  }
  console.log(`✅ Added ${prescriptions.length} prescriptions`);

  // ✅ Medical Reports
  const medicalReports = [
    {
      orgId,
      customerId,
      title: 'Blood Test Report - May 2024',
      reportType: 'Lab Report',
      reportedAt: new Date('2024-05-22'),
      notes: 'All values within normal range. Vitamin D slightly low.',
    },
    {
      orgId,
      customerId,
      title: 'General Health Checkup Report',
      reportType: 'General Checkup',
      reportedAt: new Date('2024-05-20'),
      notes: 'Overall health status: Good. BP: 120/80, HR: 72, BMI: 23.5',
    },
    {
      orgId,
      customerId,
      title: 'ECG Report',
      reportType: 'Cardiac Report',
      reportedAt: new Date('2024-05-21'),
      notes: 'Normal ECG. Heart rhythm is regular. No abnormalities.',
    },
  ];

  for (const report of medicalReports) {
    await db.medicalReport.create({ data: report });
  }
  console.log(`✅ Added ${medicalReports.length} medical reports`);

  // ✅ Follow-ups
  const followUps = [
    {
      orgId,
      customerId,
      title: 'Vitamin D Level Check',
      followUpDate: new Date('2024-08-20'),
      status: 'pending',
      description: 'Recheck Vitamin D levels after 3 months of supplementation',
    },
    {
      orgId,
      customerId,
      title: 'Lipid Profile Review',
      followUpDate: new Date('2024-09-15'),
      status: 'pending',
      description: 'Review cholesterol levels and discuss diet plan',
    },
    {
      orgId,
      customerId,
      title: 'Annual Checkup Reminder',
      followUpDate: new Date('2024-12-20'),
      status: 'pending',
      description: 'Schedule next annual health checkup',
    },
  ];

  for (const followUp of followUps) {
    await db.customerFollowUp.create({ data: followUp });
  }
  console.log(`✅ Added ${followUps.length} follow-ups`);

  console.log('\n✨ All test data added successfully!');
  console.log('\nModules with data:');
  console.log('  📅 Bookings: 4 entries');
  console.log('  📦 Packages: 3 entries');
  console.log('  🏷️  Offers: 3 entries');
  console.log('  💊 Prescriptions: 3 entries');
  console.log('  📋 Medical Reports: 3 entries');
  console.log('  📞 Follow-ups: 3 entries');
  console.log('  ⭐ Feedback: 3 entries (from previous)');
  console.log('  📄 Documents: 4 entries (from previous)');
  console.log('  📝 History: 4 entries (from previous)');
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());

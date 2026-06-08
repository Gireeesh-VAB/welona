import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const customerId = 'cmq0jn0f100097hv25x7je9v7';
  const orgId = 'default-org';

  console.log('Adding demo services (packages) for customer...\n');

  // ✅ Services/Packages (Using packages as services with prices)
  const services = [
    {
      orgId,
      customerId,
      name: 'General Consultation',
      price: 50000, // ₹500 in minor units
      totalSessions: 1,
      status: 'active',
      notes: '30-minute general health consultation with doctor',
    },
    {
      orgId,
      customerId,
      name: 'Blood Test Package',
      price: 150000, // ₹1500
      totalSessions: 1,
      status: 'active',
      notes: 'Complete blood work including CBC, lipid profile, liver & kidney function',
    },
    {
      orgId,
      customerId,
      name: 'Comprehensive Health Checkup',
      price: 300000, // ₹3000
      totalSessions: 1,
      status: 'active',
      notes: 'Full body health checkup with all basic tests and doctor consultation',
    },
    {
      orgId,
      customerId,
      name: 'Vitamin D Test',
      price: 80000, // ₹800
      totalSessions: 1,
      status: 'active',
      notes: 'Vitamin D3 (25-OH) blood test with report',
    },
    {
      orgId,
      customerId,
      name: 'COVID-19 RT-PCR Test',
      price: 45000, // ₹450
      totalSessions: 1,
      status: 'active',
      notes: 'COVID-19 RT-PCR test with home sample collection',
    },
    {
      orgId,
      customerId,
      name: 'ECG (Electrocardiogram)',
      price: 60000, // ₹600
      totalSessions: 1,
      status: 'active',
      notes: 'Complete ECG with doctor interpretation',
    },
    {
      orgId,
      customerId,
      name: 'Ultrasound Abdomen',
      price: 120000, // ₹1200
      totalSessions: 1,
      status: 'active',
      notes: 'Abdominal ultrasound imaging for organ assessment',
    },
    {
      orgId,
      customerId,
      name: 'Thyroid Function Test',
      price: 70000, // ₹700
      totalSessions: 1,
      status: 'active',
      notes: 'TSH, T3, T4 blood test for thyroid assessment',
    },
    {
      orgId,
      customerId,
      name: 'Diabetes Screening',
      price: 90000, // ₹900
      totalSessions: 1,
      status: 'active',
      notes: 'Fasting glucose, PPBS, and HbA1c testing',
    },
    {
      orgId,
      customerId,
      name: 'Follow-up Consultation',
      price: 35000, // ₹350
      totalSessions: 1,
      status: 'active',
      notes: '15-minute follow-up consultation with previous doctor',
    },
  ];

  for (const service of services) {
    try {
      await db.package.create({ data: service });
      console.log(`✅ Added: ${service.name}`);
    } catch (error) {
      console.log(`⚠️  Skipped: ${service.name} (may already exist)`);
    }
  }

  // ✅ Enhanced Prescriptions for demo
  const prescriptions = [
    {
      orgId,
      customerId,
      medications: 'Aspirin 500mg - Twice daily for 7 days | Vitamin D3 1000IU - Once daily',
      diagnosis: 'Mild pain relief & Vitamin D deficiency',
      notes: '⚠️ Allergic to Penicillin. Take Aspirin after meals.',
      issuedAt: new Date('2026-05-20'),
    },
    {
      orgId,
      customerId,
      medications:
        'Cetirizine 10mg - Once daily | Paracetamol 500mg - As needed for pain (max 3 times/day)',
      diagnosis: 'Seasonal allergies with mild fever',
      notes: 'Avoid dairy products. Stay hydrated. Take rest.',
      issuedAt: new Date('2026-05-25'),
    },
    {
      orgId,
      customerId,
      medications:
        'Multivitamin (Centrum) - Once daily with breakfast | Omega-3 Fish Oil - 2 capsules daily',
      diagnosis: 'General health maintenance and immunity boost',
      notes: 'Continue for 3 months. Recheck blood report after 2 months.',
      issuedAt: new Date('2026-06-01'),
    },
  ];

  for (const prescription of prescriptions) {
    try {
      await db.prescription.create({ data: prescription });
      console.log(`✅ Added prescription: ${prescription.medications.substring(0, 40)}...`);
    } catch (error) {
      console.log(`⚠️  Skipped prescription`);
    }
  }

  console.log('\n✨ Demo data added successfully!');
  console.log('\nServices available:');
  services.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.name} - ₹${s.price / 100}`);
  });
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());

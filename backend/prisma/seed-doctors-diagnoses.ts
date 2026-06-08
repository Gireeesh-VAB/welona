import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const branchId = 'cmq0jn006000a7hv23qw0n3d2'; // Main branch

  console.log('Adding demo doctors and diagnoses...\n');

  // ✅ Add Doctors/Employees
  const doctors = [
    {
      branchId,
      name: 'Dr. Raj Kumar',
      email: 'raj.kumar@welona.com',
      mobileNo: '9876543210',
      employeeCode: 'DOC001',
      joiningDate: new Date('2024-01-15'),
    },
    {
      branchId,
      name: 'Dr. Priya Sharma',
      email: 'priya.sharma@welona.com',
      mobileNo: '9876543211',
      employeeCode: 'DOC002',
      joiningDate: new Date('2024-02-01'),
    },
    {
      branchId,
      name: 'Dr. Amit Patel',
      email: 'amit.patel@welona.com',
      mobileNo: '9876543212',
      employeeCode: 'DOC003',
      joiningDate: new Date('2024-03-10'),
    },
    {
      branchId,
      name: 'Dr. Neha Singh',
      email: 'neha.singh@welona.com',
      mobileNo: '9876543213',
      employeeCode: 'DOC004',
      joiningDate: new Date('2024-01-20'),
    },
    {
      branchId,
      name: 'Dr. Vikas Gupta',
      email: 'vikas.gupta@welona.com',
      mobileNo: '9876543214',
      employeeCode: 'DOC005',
      joiningDate: new Date('2024-02-15'),
    },
  ];

  for (const doctor of doctors) {
    try {
      await db.employee.create({ data: doctor });
      console.log(`✅ Added doctor: ${doctor.name}`);
    } catch (error: any) {
      if (error.code === 'P2002') {
        console.log(`⚠️  Skipped: ${doctor.name} (already exists)`);
      } else {
        console.log(`⚠️  ${doctor.name} → ${error.message}`);
      }
    }
  }

  // ✅ Reference Diagnoses
  const diagnoses = [
    'High Fever',
    'Common Cold',
    'Cough & Sore Throat',
    'High Blood Pressure',
    'Diabetes',
    'Asthma',
    'Thyroid Disorder',
    'Vitamin D Deficiency',
    'Migraine',
    'Seasonal Allergies',
    'Joint Pain',
    'Acidity',
    'Skin Infection',
    'Urinary Tract Infection',
    'Cholesterol Management',
    'Heart Palpitations',
    'Sleep Disorder',
    'Anxiety Disorder',
    'Lower Back Pain',
    'Cervical Spondylosis',
  ];

  console.log('\n✨ Doctors added successfully!\n');
  console.log('Available Doctors:');
  doctors.forEach((d, i) => {
    console.log(`  ${i + 1}. ${d.name} - ${d.mobileNo}`);
  });

  console.log('\n📋 Common Diagnoses (use in prescriptions):');
  diagnoses.forEach((d, i) => {
    console.log(`  ${i + 1}. ${d}`);
  });

  console.log('\n🚀 Next Steps:');
  console.log('  1. Go to http://localhost:3001/customers/cmq0jn0f100097hv25x7je9v7');
  console.log('  2. Click "Prescription" module');
  console.log('  3. Click "+ Add Prescription"');
  console.log('  4. Select a doctor from the dropdown!');
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());

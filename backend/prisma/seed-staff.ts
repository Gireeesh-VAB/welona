import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const branchId = 'cmq0jn006000a7hv23qw0n3d2'; // Main branch

  console.log('Adding doctors/staff to the system...\n');

  const doctors = [
    {
      branchId,
      name: 'Dr. Raj Kumar',
      email: 'raj.kumar@welona.com',
      mobileNo: '9876543210',
      employeeCode: 'DOC001',
      joiningDate: new Date('2024-01-15'),
      status: 'active',
    },
    {
      branchId,
      name: 'Dr. Priya Sharma',
      email: 'priya.sharma@welona.com',
      mobileNo: '9876543211',
      employeeCode: 'DOC002',
      joiningDate: new Date('2024-02-01'),
      status: 'active',
    },
    {
      branchId,
      name: 'Dr. Amit Patel',
      email: 'amit.patel@welona.com',
      mobileNo: '9876543212',
      employeeCode: 'DOC003',
      joiningDate: new Date('2024-03-10'),
      status: 'active',
    },
    {
      branchId,
      name: 'Dr. Neha Singh',
      email: 'neha.singh@welona.com',
      mobileNo: '9876543213',
      employeeCode: 'DOC004',
      joiningDate: new Date('2024-01-20'),
      status: 'active',
    },
    {
      branchId,
      name: 'Dr. Vikas Gupta',
      email: 'vikas.gupta@welona.com',
      mobileNo: '9876543214',
      employeeCode: 'DOC005',
      joiningDate: new Date('2024-02-15'),
      status: 'active',
    },
    {
      branchId,
      name: 'Dr. Ananya Verma',
      email: 'ananya.verma@welona.com',
      mobileNo: '9876543215',
      employeeCode: 'DOC006',
      joiningDate: new Date('2024-04-01'),
      status: 'active',
    },
    {
      branchId,
      name: 'Dr. Sanjay Mishra',
      email: 'sanjay.mishra@welona.com',
      mobileNo: '9876543216',
      employeeCode: 'DOC007',
      joiningDate: new Date('2024-03-20'),
      status: 'active',
    },
  ];

  let successCount = 0;
  for (const doctor of doctors) {
    try {
      await db.employee.create({ data: doctor });
      console.log(`✅ Added: ${doctor.name}`);
      successCount++;
    } catch (error: any) {
      if (error.code === 'P2002') {
        console.log(`⚠️  ${doctor.name} - Already exists`);
      } else {
        console.log(`⚠️  ${doctor.name} - ${error.message?.substring(0, 50)}`);
      }
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✨ Added ${successCount}/${doctors.length} doctors successfully!\n`);

  console.log('📋 Doctors Added:');
  doctors.forEach((d, i) => {
    console.log(`  ${i + 1}. ${d.name}`);
    console.log(`     📧 ${d.email}`);
    console.log(`     📱 ${d.mobileNo}`);
    console.log();
  });

  console.log('🚀 Next Steps:');
  console.log('  1. Go to http://localhost:3001/dashboard/settings');
  console.log('  2. Click "Doctors" tab');
  console.log('  3. See all doctors in the list!');
  console.log('  4. Go to customer detail page');
  console.log('  5. Add a prescription and select a doctor from dropdown');
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());

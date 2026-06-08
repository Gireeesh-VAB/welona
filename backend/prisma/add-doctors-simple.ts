import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  console.log('Adding doctors to the system...\n');

  // First, get a valid branch
  const branch = await db.branch.findFirst();
  if (!branch) {
    console.log('❌ No branch found in database!');
    console.log('Please create a branch first.');
    return;
  }

  console.log(`Using branch: ${branch.name} (${branch.id})\n`);

  const doctors = [
    {
      branchId: branch.id,
      name: 'Dr. Raj Kumar',
      email: 'raj.kumar@welona.com',
      mobileNo: '9876543210',
      employeeCode: 'DOC001',
      joiningDate: new Date('2024-01-15'),
    },
    {
      branchId: branch.id,
      name: 'Dr. Priya Sharma',
      email: 'priya.sharma@welona.com',
      mobileNo: '9876543211',
      employeeCode: 'DOC002',
      joiningDate: new Date('2024-02-01'),
    },
    {
      branchId: branch.id,
      name: 'Dr. Amit Patel',
      email: 'amit.patel@welona.com',
      mobileNo: '9876543212',
      employeeCode: 'DOC003',
      joiningDate: new Date('2024-03-10'),
    },
    {
      branchId: branch.id,
      name: 'Dr. Neha Singh',
      email: 'neha.singh@welona.com',
      mobileNo: '9876543213',
      employeeCode: 'DOC004',
      joiningDate: new Date('2024-01-20'),
    },
    {
      branchId: branch.id,
      name: 'Dr. Vikas Gupta',
      email: 'vikas.gupta@welona.com',
      mobileNo: '9876543214',
      employeeCode: 'DOC005',
      joiningDate: new Date('2024-02-15'),
    },
    {
      branchId: branch.id,
      name: 'Dr. Ananya Verma',
      email: 'ananya.verma@welona.com',
      mobileNo: '9876543215',
      employeeCode: 'DOC006',
      joiningDate: new Date('2024-04-01'),
    },
    {
      branchId: branch.id,
      name: 'Dr. Sanjay Mishra',
      email: 'sanjay.mishra@welona.com',
      mobileNo: '9876543216',
      employeeCode: 'DOC007',
      joiningDate: new Date('2024-03-20'),
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
        console.log(`⚠️  ${doctor.name} - Error`);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✨ Successfully added ${successCount}/${doctors.length} doctors!\n`);

  if (successCount > 0) {
    console.log('📋 Doctors Added:');
    const addedDoctors = await db.employee.findMany({
      where: { branchId: branch.id },
      orderBy: { createdAt: 'desc' },
      take: successCount,
    });

    addedDoctors.forEach((d, i) => {
      console.log(`  ${i + 1}. ${d.name}`);
      console.log(`     📧 ${d.email}`);
      console.log(`     📱 ${d.mobileNo}\n`);
    });

    console.log('🚀 Next Steps:');
    console.log('  1. Go to http://localhost:3001/dashboard/settings');
    console.log('  2. Click "Doctors" tab');
    console.log('  3. See all doctors in the list!');
    console.log('  4. Go to customer detail page');
    console.log('  5. Add a prescription and select a doctor from dropdown');
  }
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());

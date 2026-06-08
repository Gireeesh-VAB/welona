import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  console.log('Checking for doctors in the database...\n');

  const employees = await db.employee.findMany({
    include: { branch: true },
  });

  console.log(`Total Employees: ${employees.length}\n`);

  if (employees.length === 0) {
    console.log('❌ No employees found!');
  } else {
    console.log('📋 Employees in Database:');
    employees.forEach((e, i) => {
      console.log(`  ${i + 1}. ${e.name}`);
      console.log(`     📧 ${e.email}`);
      console.log(`     📱 ${e.mobileNo}`);
      console.log(`     🏢 Branch: ${e.branch?.name || 'None'}`);
      console.log();
    });
  }

  console.log('✅ Database check complete!');
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());

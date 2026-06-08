import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const staff = await db.staff.findUnique({
    where: { email: 'teststaff@welona.com' }
  });

  if (!staff) {
    console.log('❌ Test Staff not found');
    return;
  }

  const updated = await db.staff.update({
    where: { email: 'teststaff@welona.com' },
    data: { name: 'Test Branch' }
  });

  console.log('\n✅ RENAMED SUCCESSFULLY!\n');
  console.log('Old Name: Test Staff');
  console.log('New Name: Test Branch');
  console.log('Email: teststaff@welona.com');
  console.log('Branch: Banjara Hills');
  console.log('\n🎯 TEST PORTAL READY!');
  console.log('   Login: http://localhost:3001/login');
  console.log('   Email: teststaff@welona.com');
  console.log('   Password: Test@123\n');
}

main().catch(console.error).finally(() => db.$disconnect());

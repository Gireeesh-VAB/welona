import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const customers = await db.customer.findMany({
    include: { branch: true },
    orderBy: { createdAt: 'desc' },
  });

  console.log('\n📊 ALL CUSTOMERS DATA\n');
  console.log(`Total customers: ${customers.length}\n`);

  customers.forEach((c, i) => {
    console.log(`${i + 1}. ${c.name}`);
    console.log(`   ID: ${c.id}`);
    console.log(`   Email: ${c.email || 'N/A'}`);
    console.log(`   Phone: ${c.phone || 'N/A'}`);
    console.log(`   Type: ${c.type}`);
    console.log(`   Branch: ${c.branch?.name || 'N/A'}`);
    console.log(`   Company: ${c.companyName || 'N/A'}`);
    console.log(`   City: ${c.city || 'N/A'}`);
    console.log(`   TEST URL: http://localhost:3001/customers/${c.id}`);
    console.log('');
  });
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());

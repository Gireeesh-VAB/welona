import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const branches = await db.branch.findMany({ take: 5 });
  console.log('Available Branches:');
  branches.forEach((b) => {
    console.log(`  ID: ${b.id}`);
    console.log(`  Name: ${b.name}`);
    console.log();
  });

  if (branches.length === 0) {
    console.log('No branches found. Using default branch ID: cmq0jn006000a7hv23qw0n3d2');
  }
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());

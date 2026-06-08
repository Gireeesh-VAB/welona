import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const customerId = 'cmq0jn0ep00077hv2nwbynsil';
  const branchId = 'cmq0jn006000a7hv23qw0n3d2'; // Jubilee Hills branch

  console.log('Adding booking data for Health Plus Solutions...\n');

  // Add Bookings
  const bookings = [
    {
      orgId: 'default-org',
      branchId,
      customerId,
      serviceName: 'Annual Health Checkup',
      status: 'confirmed',
      notes: 'Annual health checkup scheduled',
      scheduledAt: new Date('2024-06-15'),
    },
    {
      orgId: 'default-org',
      branchId,
      customerId,
      serviceName: 'Health Consultation',
      status: 'completed',
      notes: 'Health consultation session completed',
      scheduledAt: new Date('2024-05-20'),
    },
    {
      orgId: 'default-org',
      branchId,
      customerId,
      serviceName: 'Medical Report Review',
      status: 'pending',
      notes: 'Medical report review appointment',
      scheduledAt: new Date('2024-06-25'),
    },
  ];

  for (const booking of bookings) {
    await db.booking.create({
      data: booking,
    });
  }
  console.log(`✅ Added ${bookings.length} bookings`);

  console.log('\n✨ Booking data added successfully for Health Plus Solutions!');
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());

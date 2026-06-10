import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

const INDIAN_STATES = [
  { name: 'Andhra Pradesh',        code: 'AP' },
  { name: 'Arunachal Pradesh',     code: 'AR' },
  { name: 'Assam',                 code: 'AS' },
  { name: 'Bihar',                 code: 'BR' },
  { name: 'Chhattisgarh',         code: 'CG' },
  { name: 'Goa',                   code: 'GA' },
  { name: 'Gujarat',               code: 'GJ' },
  { name: 'Haryana',               code: 'HR' },
  { name: 'Himachal Pradesh',      code: 'HP' },
  { name: 'Jharkhand',             code: 'JH' },
  { name: 'Karnataka',             code: 'KA' },
  { name: 'Kerala',                code: 'KL' },
  { name: 'Madhya Pradesh',        code: 'MP' },
  { name: 'Maharashtra',           code: 'MH' },
  { name: 'Manipur',               code: 'MN' },
  { name: 'Meghalaya',             code: 'ML' },
  { name: 'Mizoram',               code: 'MZ' },
  { name: 'Nagaland',              code: 'NL' },
  { name: 'Odisha',                code: 'OD' },
  { name: 'Punjab',                code: 'PB' },
  { name: 'Rajasthan',             code: 'RJ' },
  { name: 'Sikkim',                code: 'SK' },
  { name: 'Tamil Nadu',            code: 'TN' },
  { name: 'Telangana',             code: 'TG' },
  { name: 'Tripura',               code: 'TR' },
  { name: 'Uttar Pradesh',         code: 'UP' },
  { name: 'Uttarakhand',           code: 'UK' },
  { name: 'West Bengal',           code: 'WB' },
  // Union Territories
  { name: 'Andaman and Nicobar',   code: 'AN' },
  { name: 'Chandigarh',            code: 'CH' },
  { name: 'Dadra and Nagar Haveli and Daman and Diu', code: 'DD' },
  { name: 'Delhi',                 code: 'DL' },
  { name: 'Jammu and Kashmir',     code: 'JK' },
  { name: 'Ladakh',                code: 'LA' },
  { name: 'Lakshadweep',           code: 'LD' },
  { name: 'Puducherry',            code: 'PY' },
];

const GST_RATES = [
  { name: 'GST 5%',  percentage: 5,  taxType: 'exclusive' },
  { name: 'GST 12%', percentage: 12, taxType: 'exclusive' },
  { name: 'GST 18%', percentage: 18, taxType: 'exclusive' },
  { name: 'GST 28%', percentage: 28, taxType: 'exclusive' },
];

async function main() {
  // Seed states
  for (const s of INDIAN_STATES) {
    await db.state.upsert({
      where: { code: s.code },
      update: { name: s.name },
      create: { name: s.name, code: s.code },
    });
  }
  console.log('Seeded', INDIAN_STATES.length, 'states');

  // Seed GST rates — no unique field besides id, so check by name first
  let created = 0;
  for (const r of GST_RATES) {
    const existing = await db.gstRate.findFirst({ where: { name: r.name } });
    if (!existing) {
      await db.gstRate.create({
        data: { name: r.name, percentage: r.percentage, taxType: r.taxType },
      });
      created++;
    }
  }
  console.log(`Seeded ${created} new GST rates (${GST_RATES.length - created} already existed)`);
}

main().catch(console.error).finally(() => db.$disconnect());

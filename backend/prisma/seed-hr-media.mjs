/**
 * HR demo enrichment: give every employee a generated photo and a couple of
 * documents (Aadhaar + PAN placeholders) so the ID-card, photo and document
 * features have data to show. Idempotent — skips documents already present.
 *
 * Run with the backend's Prisma client: `node prisma/seed-hr-media.mjs`.
 */
import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

const PALETTE = ['#C9A227', '#4C9A2A', '#2A6FB0', '#B0452A', '#7A4CB0', '#0E7C7B', '#C0392B', '#2C3E50', '#16A085', '#8E44AD'];
const b64 = (s) => 'data:image/svg+xml;base64,' + Buffer.from(s).toString('base64');

/** A circular-initial avatar SVG as a data URL. */
function avatar(name, color) {
  const initial = (name.trim()[0] || '?').toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" rx="12" fill="${color}"/><text x="64" y="86" font-size="60" font-family="Arial, sans-serif" fill="#ffffff" text-anchor="middle">${initial}</text></svg>`;
  return b64(svg);
}
/** A simple "document" placeholder SVG as a data URL. */
function docImage(label, color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="190"><rect width="300" height="190" fill="#f4f4f4" stroke="${color}" stroke-width="3"/><rect x="0" y="0" width="300" height="34" fill="${color}"/><text x="12" y="23" font-size="16" font-family="Arial" fill="#fff">${label}</text><text x="12" y="70" font-size="13" font-family="Arial" fill="#333">Demo document — ${label}</text><text x="12" y="100" font-size="12" font-family="Arial" fill="#777">Welona Health &amp; Wellness</text></svg>`;
  return b64(svg);
}

(async () => {
  const employees = await db.employee.findMany({ orderBy: { employeeCode: 'asc' } });
  console.log(`Enriching ${employees.length} employees…`);
  let photos = 0;
  let docsAdded = 0;

  for (let i = 0; i < employees.length; i++) {
    const e = employees[i];
    const color = PALETTE[i % PALETTE.length];

    // Photo (always set so every ID card looks complete).
    await db.employee.update({ where: { id: e.id }, data: { photoUrl: avatar(e.name, color) } });
    photos++;

    // Two documents each — skip ones already present (idempotent).
    const wanted = [
      { title: 'Aadhaar Card', docType: 'ID proof' },
      { title: 'PAN Card', docType: 'ID proof' },
    ];
    const existing = await db.employeeDocument.findMany({ where: { employeeId: e.id }, select: { title: true } });
    const have = new Set(existing.map((d) => d.title));
    for (const w of wanted) {
      if (have.has(w.title)) continue;
      await db.employeeDocument.create({
        data: { employeeId: e.id, title: w.title, docType: w.docType, fileUrl: docImage(w.title, color) },
      });
      docsAdded++;
    }
  }

  console.log(`✅ Photos set: ${photos} | documents added: ${docsAdded}`);
  console.log(`Totals → withPhoto: ${await db.employee.count({ where: { photoUrl: { not: null } } })}, documents: ${await db.employeeDocument.count()}`);
  await db.$disconnect();
})().catch(async (e) => { console.error('FAILED:', e); await db.$disconnect(); process.exit(1); });

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'csv-parse/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function main (prisma) {
  console.log('Seeding deflection details...');

  const adminUser = await prisma.user.findUnique({
    where: { email: 'admin@careconnectsf.org' },
  });

  if (!adminUser) {
    throw new Error('Admin user not found for seeding deflection details');
  }

  const csvPath = path.resolve(__dirname, '../../static-data/details.csv');

  if (!fs.existsSync(csvPath)) {
    console.warn(`CSV file not found at ${csvPath}, skipping deflection details seeding.`);
    return;
  }

  const fileContent = fs.readFileSync(csvPath, 'utf8');
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  });

  const categories = new Set();
  let detailsSeeded = 0;

  for (const record of records) {
    const categoryName = record.Category;
    const detailName = record.Detail;

    if (!categoryName || !detailName) continue;

    const categoryId = slugify(categoryName);
    const detailId = slugify(detailName);

    if (!categories.has(categoryId)) {
      await prisma.deflectionDetailCategory.upsert({
        where: { id: categoryId },
        update: {
          name: categoryName,
          updatedById: adminUser.id,
        },
        create: {
          id: categoryId,
          name: categoryName,
          createdById: adminUser.id,
          updatedById: adminUser.id,
        },
      });
      categories.add(categoryId);
    }

    await prisma.deflectionDetail.upsert({
      where: { id: detailId },
      update: {
        name: detailName,
        deflectionDetailCategoryId: categoryId,
        updatedById: adminUser.id,
      },
      create: {
        id: detailId,
        deflectionDetailCategoryId: categoryId,
        name: detailName,
        createdById: adminUser.id,
        updatedById: adminUser.id,
      },
    });
    detailsSeeded++;
  }

  console.log(`Done seeding deflection details! (${categories.size} categories, ${detailsSeeded} details)`);
}

function slugify (value) {
  return (value || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

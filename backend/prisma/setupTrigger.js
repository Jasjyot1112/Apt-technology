const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('Reading trigger.sql...');
  const sql = fs.readFileSync(path.join(__dirname, '../db/trigger.sql'), 'utf8');

  console.log('Executing trigger setup on database...');
  // Prisma's executeRawUnsafe allows us to run multiple statements if needed, 
  // but some complex statements might require multiple calls or using standard pg client.
  // We'll execute the script using the pg client since Prisma's $executeRawUnsafe can sometimes be tricky with PL/pgSQL functions.
  
  const { Client } = require('pg');
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  try {
    await client.query(sql);
    console.log('✅ Trigger and notify function set up successfully!');
  } catch (error) {
    console.error('❌ Error setting up trigger:', error);
  } finally {
    await client.end();
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

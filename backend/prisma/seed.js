const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial data...');
  
  const orders = [
    { customer_name: 'Alice Smith', product_name: 'MacBook Pro', status: 'pending' },
    { customer_name: 'Bob Jones', product_name: 'iPhone 15', status: 'shipped' },
    { customer_name: 'Charlie Brown', product_name: 'AirPods Max', status: 'delivered' },
  ];

  for (const order of orders) {
    await prisma.order.create({
      data: order,
    });
  }

  console.log('✅ Initial seed data inserted.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

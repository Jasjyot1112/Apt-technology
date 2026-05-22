const { Client } = require('pg');
const { broadcastDbChange } = require('../socket');

async function setupDbListener() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL for LISTEN/NOTIFY');

    // Listen to the channel defined in our trigger
    await client.query('LISTEN order_changes');

    client.on('notification', (msg) => {
      if (msg.channel === 'order_changes') {
        try {
          const payload = JSON.parse(msg.payload);
          console.log(`[DB Listener] Received ${payload.operation} on orders table`);
          
          // Broadcast via Socket.IO
          broadcastDbChange(payload);
        } catch (error) {
          console.error('[DB Listener] Error parsing notification payload', error);
        }
      }
    });

    client.on('error', (err) => {
      console.error('[DB Listener] Database client error:', err.stack);
    });

  } catch (error) {
    console.error('❌ Failed to connect for DB listener:', error);
  }
}

module.exports = { setupDbListener };

const { Server } = require('socket.io');

let io;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: "*", // allow all for dev purposes
      methods: ["GET", "POST", "PUT", "DELETE"]
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket.IO] New client connected: ${socket.id}`);

    // Advanced Feature: Event acknowledgment and handling reconnection conceptually
    socket.on('ping', (cb) => {
      if (typeof cb === 'function') cb('pong');
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

function getIo() {
  if (!io) {
    throw new Error("Socket.IO not initialized!");
  }
  return io;
}

// Function to broadcast db changes
function broadcastDbChange(payload) {
  if (io) {
    io.emit('db_change', payload);
    console.log(`[Socket.IO] Broadcasted db_change event: ${payload.operation} on Order ID ${payload.data.id}`);
  }
}

module.exports = {
  initSocket,
  getIo,
  broadcastDbChange
};

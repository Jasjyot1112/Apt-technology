# Real-Time Database Change Notification System

A full-stack, scalable backend system demonstrating event-driven architecture, where connected clients automatically receive real-time updates whenever data changes in the database **without polling**.

This project is designed as an interview-quality assignment highlighting production-ready practices, modularity, and advanced real-time communication techniques.

## Architecture Overview

This system utilizes PostgreSQL's native `LISTEN` and `NOTIFY` capabilities combined with triggers to emit events on database mutations (INSERT, UPDATE, DELETE). A Node.js backend listens for these events and broadcasts them instantly to all connected frontend clients via WebSockets (Socket.IO).

### Architecture Flow Diagram

```text
+----------------+        +-----------------+        +-------------------+
|  REST API      |        |                 |        |                   |
|  (Express.js)  +------->+   PostgreSQL    +<-------+   Other Systems   |
|                |        |   Database      |        |   (Optional)      |
+----------------+        +--------+--------+        +-------------------+
                                   |
                                   | 1. DB Mutation (INSERT/UPDATE/DELETE)
                                   | 2. Trigger Function Executes
                                   v
                          +-----------------+
                          |                 |
                          |  pg_notify()    |  <-- Payload: {operation, data, timestamp}
                          |                 |
                          +--------+--------+
                                   |
                                   | 3. Broadcasts to 'order_changes' channel
                                   v
                          +-----------------+
                          |  Node.js Event  |  <-- connected via `pg` LISTEN
                          |  Listener       |
                          +--------+--------+
                                   |
                                   | 4. Emits internal 'db_change' event
                                   v
                          +-----------------+
                          |  Socket.IO      |
                          |  Server         |
                          +--------+--------+
                                   |
                                   | 5. Broadcasts via WebSockets
                                   v
                 +-----------------------------------+
                 |                                   |
        +--------v--------+                 +--------v--------+
        |                 |                 |                 |
        |  Client 1 (UI)  |                 |  Client 2 (UI)  |
        |                 |                 |                 |
        +-----------------+                 +-----------------+
```

## Features

- **Event-Driven Architecture**: Complete removal of inefficient database polling.
- **PostgreSQL Triggers & Listen/Notify**: Database-level event emission ensures that *any* system modifying the DB will trigger real-time UI updates, not just changes made through the API.
- **Real-Time WebSockets**: Instant bidirectional communication using Socket.IO.
- **RESTful API**: Standard CRUD operations using Express.js and Prisma ORM.
- **Responsive Dark Theme UI**: A modern, premium frontend dashboard built with vanilla HTML/CSS/JS, featuring micro-animations and toast notifications.
- **Dockerized Database**: Easy setup via `docker-compose`.
- **Reconnection Handling**: Socket.IO automatically handles network drops and reconnects gracefully.

## Tech Stack

- **Backend**: Node.js, Express.js
- **Real-Time**: Socket.IO
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Frontend**: HTML5, Vanilla JavaScript, CSS3
- **Infrastructure**: Docker, Docker Compose

## Setup Instructions

### Prerequisites
- Node.js (v18+ recommended)
- Docker and Docker Compose
- npm or yarn

### 1. Clone & Install
Navigate into the `backend` folder and install dependencies:
```bash
cd backend
npm install
```

### 2. Environment Variables
Create a `.env` file in the `backend` directory (or use the provided `.env.example`):
```env
PORT=3000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/order_tracking?schema=public"
```

### 3. Start Database
From the root of the project (where `docker-compose.yml` is located), spin up the Postgres database:
```bash
docker-compose up -d
```

### 4. Database Setup & Seeding
Run the combined setup script. This will generate the Prisma client, push the schema, set up the raw SQL trigger/notify functions, and seed initial data:
```bash
npm run db:setup
```

*Under the hood, this runs `prisma generate`, `prisma db push`, and custom Node scripts to run `trigger.sql` and `seed.js`.*

### 5. Start the Server
Start the development server:
```bash
npm run dev
```
The backend is now running at `http://localhost:3000`.

### 6. Open the Frontend
Simply open `frontend/index.html` in any modern web browser. 
*(Optional: Serve it via Live Server extension or any static HTTP server for the best experience).*

## How the Real-Time Flow Works

1. **Mutation**: A REST API call (or direct DB manipulation) inserts/updates/deletes a row in the `orders` table.
2. **Trigger**: PostgreSQL fires the `order_changes_trigger` `AFTER` the mutation.
3. **Notify**: The trigger executes the `notify_order_changes` function, which formats the old/new row data into a JSON payload and calls `pg_notify('order_changes', payload)`.
4. **Listen**: In Node.js, `src/db/listener.js` maintains an active connection to Postgres and issues `LISTEN order_changes`.
5. **Broadcast**: Upon receiving the notification, the listener parses the JSON and passes it to the Socket.IO server (`src/socket.js`), which emits a `db_change` event to all connected frontend clients.
6. **UI Update**: The frontend (`app.js`) catches the `db_change` event, updates the DOM with a highlighting animation, and displays a toast notification.

## Scalability Discussion

### Why Polling is Inefficient
Polling requires clients (or the backend) to constantly query the database at fixed intervals (e.g., every 5 seconds) to check for updates. 
- **Wasted Resources**: 99% of polling queries return no new data, wasting CPU, memory, and database connection pools.
- **Latency**: Changes are not truly real-time. If polling happens every 5 seconds, an update might be delayed by up to 4.99 seconds.

### Why WebSockets & LISTEN/NOTIFY are Better
- **WebSockets** establish a persistent, bidirectional TCP connection. The server pushes data to the client *only* when an event occurs, resulting in zero wasted queries and sub-millisecond latency.
- **LISTEN/NOTIFY** moves the event generation to the database layer. This ensures the backend doesn't need to manually orchestrate events in the API layer. If a background worker, a cron job, or a manual DB query modifies a record, the event still fires perfectly.

### Horizontal Scaling & Future Improvements
Currently, the Node.js process holds both the DB Listener and the Socket.IO server. If we scale to multiple Node.js instances behind a load balancer:

1. **Redis Pub/Sub Adapter for Socket.IO**: Multiple Node.js instances won't share the same WebSocket clients. Using the Socket.IO Redis adapter ensures that a broadcast from Node Instance A reaches a client connected to Node Instance B.
2. **Dedicated DB Listener Service**: Instead of every Node instance executing `LISTEN` (which creates multiple DB connections and duplicate events), we can extract the DB listener into a single microservice.
3. **Kafka / RabbitMQ**: The dedicated listener microservice catches `pg_notify`, pushes the event to a Kafka topic or RabbitMQ exchange. The multiple Node.js Socket servers consume from this queue and broadcast to users. This decouples the database entirely from the WebSocket fleet.

## API Documentation

Base URL: `http://localhost:3000/api/orders`

| Method | Endpoint | Description | Body / Params |
|--------|----------|-------------|---------------|
| `GET`  | `/`      | Get all orders | none |
| `POST` | `/`      | Create new order | `{ customer_name, product_name, status? }` |
| `PUT`  | `/:id`   | Update an order | `{ customer_name?, product_name?, status? }` |
| `DELETE`| `/:id`   | Delete an order | none |

## Interview Talking Points

- **Idempotency**: The SQL script uses `CREATE OR REPLACE FUNCTION` and `DROP TRIGGER IF EXISTS` making DB initialization idempotent.
- **Graceful Shutdown**: The server listens for `SIGTERM` to close HTTP connections safely, crucial for Kubernetes/Docker deployments.
- **Separation of Concerns**: Prisma is used strictly for CRUD operations and ORM modeling, while the lightweight `pg` driver is used for the long-lived `LISTEN` connection, avoiding tying up Prisma's connection pool.
- **Edge Case Handling**: Handled Prisma `P2025` errors (Record to update/delete not found) mapping them to proper `404 Not Found` HTTP responses.
- **Socket Acknowledgment**: Implemented a `ping/pong` concept for Socket.IO advanced feature demonstrations.

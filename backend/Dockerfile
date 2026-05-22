FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY prisma ./prisma/
# Generate Prisma Client
RUN npx prisma generate

COPY src ./src/

EXPOSE 3000

# We don't run the DB setup (push, trigger, seed) here because it needs an active DB.
# It should be run separately (e.g. via an init container or script) or handled by the host.
# For simplicity, this starts the server.
CMD ["npm", "start"]

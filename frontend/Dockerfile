# Stage 1 — Dependencies & Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies
RUN npm install

# Copy source code
COPY . .

# Build (if your project uses build step; otherwise remove)
RUN npm run build || echo "No build step"

# Stage 2 — Production Minimal Image
FROM node:20-alpine

WORKDIR /app

# Copy package files again
COPY package*.json ./

# Install ONLY production dependencies
RUN npm install --omit=dev

# Copy built code
COPY --from=builder /app ./

# Prisma: generate client
RUN npx prisma generate || echo "No Prisma"

# Expose Render port
EXPOSE 10000

# Start the server
CMD ["npm", "start"]

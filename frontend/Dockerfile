# Stage 1 — Install dependencies & build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies
RUN npm install

# Copy source code
COPY . .

# Build (if your project uses build step)
RUN npm run build || echo "No build script"

# Stage 2 — Production Image
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ONLY production dependencies
RUN npm install --omit=dev

# Copy everything from builder
COPY --from=builder /app ./

# Prisma client (if applicable)
RUN npx prisma generate || echo "No prisma"

# Expose port for Render
EXPOSE 10000

# Start the backend server
CMD ["npm", "start"]

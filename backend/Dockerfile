FROM node:20-slim

# Install OpenSSL for Prisma Query Engine and CA certificates
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency files
COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma/

# Install Node dependencies
RUN npm ci

# Copy source code
COPY src ./src/

# Generate Prisma Client and build the TypeScript project
RUN npx prisma generate
RUN npm run build

# Copy the pre-downloaded dataset and precomputed models
COPY data ./data/

# Copy the compiled frontend static assets for monolithic SPA serving
COPY public ./public/

# Expose port and configure environment
EXPOSE 8080
ENV PORT=8080
ENV NODE_ENV=production

# Automatically push database schema updates and start the server
CMD ["sh", "-c", "npx prisma db push || echo 'Prisma push skipped'; npm start"]


FROM node:20-slim

# Install system dependencies, python3, and precompiled python libraries
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-pandas \
    python3-nltk \
    && rm -rf /var/lib/apt/lists/*

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

# Copy the Python classifier script to the output directory so runtime paths match
RUN cp src/services/classify_emotion.py dist/services/

# Copy the pre-downloaded data and NLTK resources
COPY data ./data/
COPY nltk_data ./nltk_data/

# Expose port and configure environment
EXPOSE 8080
ENV PORT=8080
ENV NODE_ENV=production
ENV PYTHON_PATH=python3

# Automatically push database schema updates and start the server
CMD ["sh", "-c", "npx prisma db push || echo 'Prisma push skipped'; npm start"]

FROM node:22-alpine

WORKDIR /app

# Configure production environment
ENV NODE_ENV=production

# Install only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy application source code
COPY src ./src

# Run as non-root user
USER node

EXPOSE 3000

CMD ["node", "src/server.js"]

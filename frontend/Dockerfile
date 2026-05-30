FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Builds the optimized Next.js production files
RUN npm run build 

FROM node:20-alpine AS runner
WORKDIR /app

# Set to production environment
ENV NODE_ENV=production

# Copy only the necessary build artifacts from the builder stage
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000

# Drop to non-root user
USER node

# Start the Next.js production server
CMD ["npm", "start"]

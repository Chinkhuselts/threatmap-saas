# Use a lightweight Node.js alpine image for a smaller attack surface
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker layer caching
COPY package*.json ./

# Install only production dependencies
RUN npm install --production

# Copy the rest of the application code
COPY . .

# Force the Node app to run on port 5000 to avoid conflicting with Next.js
ENV PORT=5000

# Expose the correct backend API port
EXPOSE 5000

# Security best practice: switch to a non-root user
USER node

# Start the Node.js application
CMD ["node", "server.js"]

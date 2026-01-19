# Use official Node.js 22 LTS image as base
FROM node:22-alpine

# Set working directory in container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Create data directory for leaderboard persistence
RUN mkdir -p /app/data

# Declare volume for persistent data
VOLUME ["/app/data"]

# Expose the port the app runs on
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Start the application
CMD ["npm", "start"]

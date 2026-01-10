# Use Node LTS
FROM node:20

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install 

# Copy the rest of the backend code
COPY . .

# Expose port
EXPOSE 8000

# Start server
CMD ["node", "index.js"]

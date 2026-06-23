FROM node:20-alpine

WORKDIR /app

# Install server dependencies
COPY server/package*.json ./server/
RUN cd server && npm install --production

# Install client dependencies
COPY client/package*.json ./client/
RUN cd client && npm install

# Build React frontend
COPY client/ ./client/
RUN cd client && npm run build

# Copy server source
COPY server/ ./server/

ENV NODE_ENV=production
ENV PORT=8080
ENV DATA_DIR=/data

EXPOSE 8080

CMD ["node", "server/src/index.js"]

FROM --platform=linux/amd64 node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 8080
ENV PORT=8080
CMD ["node", "dist/server.js"]

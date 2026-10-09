FROM --platform=linux/amd64 node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps
COPY . .
RUN npm run build
RUN npm prune --omit=dev
EXPOSE 8080
ENV PORT=8080
CMD ["node", "dist/server.js"]

FROM node:22-slim

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production \
    PORT=3000 \
    DATABASE_PATH=/data/omurice.db
VOLUME ["/data"]
EXPOSE 3000

CMD ["npm", "start"]

FROM node:22-slim

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ffmpeg converts uploaded phone videos (HEVC .mov, 4K) to web-safe MP4.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg \
 && rm -rf /var/lib/apt/lists/*

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

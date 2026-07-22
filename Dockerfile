FROM node:22-slim

# Install python3/pip (yt-dlp dependency) and ffmpeg (needed for some format merges),
# then install yt-dlp itself as a standalone binary
RUN apt-get update && apt-get install -y python3 python3-pip ffmpeg curl ca-certificates && \
    curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install deps first (better Docker layer caching — only reinstalls if package.json changes)
COPY package*.json ./
RUN npm install

# Copy source and compile
COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
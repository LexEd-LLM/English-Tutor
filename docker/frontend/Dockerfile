FROM node:18.18-alpine

WORKDIR /app

# Copy package info and install early for cache
COPY frontend/package*.json ./
RUN npm install

# Copy the entire frontend source
COPY frontend/ ./

# THÊM ĐOẠN NÀY để truyền NEXT_PUBLIC_BACKEND_URL vào lúc build
ARG NEXT_PUBLIC_BACKEND_URL
ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL

ARG BACKEND_URL
ENV BACKEND_URL=$BACKEND_URL

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "start"]
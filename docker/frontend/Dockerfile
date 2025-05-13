FROM node:18.18-alpine

WORKDIR /app

# Copy và install dependencies sớm để tận dụng cache
COPY frontend/package*.json ./
RUN npm install

# Copy toàn bộ mã frontend sau cùng
COPY frontend/ ./

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
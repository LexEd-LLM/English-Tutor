FROM node:18.18-alpine

WORKDIR /app

# Copy và install dependencies sớm để tận dụng cache
COPY frontend/package*.json ./
RUN npm install

# Copy toàn bộ mã frontend sau cùng
COPY frontend/ ./

# Ghi đè biến môi trường với giá trị cho Docker container (dùng để debug backend trên localhost)
# ENV NEXT_PUBLIC_BACKEND_URL=http://host.docker.internal:8000
# ENV BACKEND_URL=http://host.docker.internal:8000

ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1

EXPOSE 3000

CMD ["npm", "run", "dev"]

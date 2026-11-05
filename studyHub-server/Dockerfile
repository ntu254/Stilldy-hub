# ---------- Build ----------
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

# Loại bỏ devDependencies để chuẩn bị cho môi trường Production
RUN npm prune --omit=dev


# ---------- Production ----------
FROM node:22-alpine

WORKDIR /app

# Thiết lập biến môi trường chạy Production
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8888

# Copy build artifacts và production node_modules từ builder dưới quyền node user
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/package.json ./package.json

# Tạo thư mục logs và phân quyền cho node user trước khi chuyển sang USER node
RUN mkdir -p /app/logs && chown -R node:node /app/logs

# Sử dụng non-root user 'node' của Alpine vì lý do bảo mật
USER node

# Mở cổng 8888 theo cấu hình
EXPOSE 8888

CMD ["node", "dist/main.js"]
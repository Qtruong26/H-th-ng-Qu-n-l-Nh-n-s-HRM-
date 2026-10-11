# ==========================================
# HARDENED DOCKERFILE CHO HRM APPLICATION
# ==========================================
FROM node:20-alpine AS base

# Cài đặt dumb-init để xử lý signals và zombie process
RUN apk add --no-cache dumb-init

WORKDIR /usr/src/app

# Tạo thư mục logs và phân quyền cho user node (không chạy quyền ROOT)
RUN mkdir -p /var/log/app && chown -R node:node /var/log/app /usr/src/app

# Sao chép manifest dependency
COPY package*.json ./

# Cài đặt dependencies (chỉ production packages)
RUN npm install --omit=dev && npm cache clean --force

# Sao chép mã nguồn ứng dụng
COPY --chown=node:node . .

# ================= HARDENING =================
# Chuyển sang non-root user 'node' (UID 1000)
USER node

# Biến môi trường mặc định
ENV NODE_ENV=production \
    PORT=3000 \
    LOG_DIR=/var/log/app

EXPOSE 3000

# Healthcheck định kỳ cho container
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "src/server.js"]

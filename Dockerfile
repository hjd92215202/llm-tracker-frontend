# 阶段 1: 构建 (Node.js)
FROM node:22-alpine AS build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# 阶段 2: 部署 (OpenNJet)
FROM tmlake/njet:latest
# OpenNJet 的默认静态目录可能与 Nginx 略有不同，通常在 /usr/share/njet/html
COPY --from=build-stage /app/dist /usr/share/njet/html

USER root
RUN chmod -R 755 /usr/share/njet/html

# 复制配置文件
COPY njet.conf /usr/local/njet/conf/njet.conf

EXPOSE 80 443
CMD ["njet", "-g", "daemon off;"]
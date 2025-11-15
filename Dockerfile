# 使用官方 Node.js 镜像作为基础镜像
FROM node:20

# 创建并设置工作目录
WORKDIR /usr/src/app

# 复制所有源代码到工作目录
COPY . .

# 安装 pnpm
RUN npm install -g pnpm

# 安装项目依赖
RUN pnpm install

# Cloudflare Workers 部署模式
ENV CLOUDFLARE_MODE=false

# 构建 Nuxt.js 应用程序
RUN pnpm build

# 暴露端口
EXPOSE 3000

# 启动 Nuxt.js 应用程序
CMD [ "pnpm", "start-docker" ]

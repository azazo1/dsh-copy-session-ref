[private]
default:
    @just --list

# 安装依赖.
install:
    pnpm install

# 构建 Host ESM 和 Client IIFE.
build:
    pnpm run build

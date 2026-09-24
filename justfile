[private]
default:
    @just --list

# 安装依赖.
install:
    pnpm install

# TypeScript 类型检查, 不生成文件.
typecheck:
    pnpm run typecheck

# 跑命名规则与 mention 转义的纯函数测试.
test:
    pnpm test

# 构建 Host ESM 与类型声明.
build-host:
    pnpm run build:host

# 构建 Client CJS factory bundle.
build-client:
    pnpm run build:client

# 构建全部产物.
build: build-host build-client

# 检查 Client 产物是否按 loader 约定注册.
check-client:
    node scripts/check-client.mjs

# 类型检查, 测试, 构建, 并检查 Client 产物.
verify: typecheck test build check-client

# dsh-copy-session-ref

在 DeepSeek Harness 会话行菜单底部增加 "复制引用". 复制的是规范 mention `@[标题](dsh-session:...)`, 粘贴到另一个会话的输入框并发送, 即可召回该会话上下文.

兼容 DSH `0.1.2-rc.1`.

## 安装

```shell
dsh plugin --profile web add github:azazo1/dsh-copy-session-ref
```

本地开发:

```shell
just install
just build
dsh plugin --profile web add .
```

改完 Client 产物后需要重启 `dsh web`.

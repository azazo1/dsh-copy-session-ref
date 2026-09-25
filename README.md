# dsh-copy-session-ref

在 DeepSeek Harness 会话行菜单底部增加 "复制引用". 复制的是规范 mention `@[名称](dsh-session:...)`, 粘贴到输入框并发送即可召回该会话上下文.

复制前会按可配置的正则规则把会话标题改写成引用名称, 避免标题里的空格让模型分不清 "名称" 与 "本次提示词" 的边界.

兼容 DSH `0.1.7-rc.1`.

## 命名规则

默认三条规则, 按顺序作用在标题上:

| 正则 | flags | 替换为 |
| --- | --- | --- |
| `\s+` | `gu` | `-` |
| `"` | `gu` | `\"` |
| `^([\s\S]*)$` | `u` | `"$1"` |

于是 `raw title` 复制出的 mention 是 `@["raw-title"](dsh-session:...)`, 发送后模型看到的是:

```text
@"raw-title" 你这次写的提示词
```

标题里本来就有双引号时, 第二条规则先转义它, 第三条规则再包外层引号, 所以 `my "cool" title` 得到 `"my-\"cool\"-title"`.

空标题经第三条规则得到 `""`, 模型看到 `@""`, 不需要额外兜底.

规则语义:

- 每条规则等价于 `label.replace(new RegExp(pattern, flags), replacement)`, 替换文本支持 `$1` 与 `$&`.
- 规则按顺序应用, 后面的规则看到前面的结果; 可上下移动, 可单条停用.
- `pattern` 留空的规则跳过; 正则编译失败的规则在复制时跳过, 不会让整条复制失败.
- 规则跑完后只做最小转义: `\` 与 `]` 转义, 换行与制表符折成空格. 名称里出现 `]` 时引用仍能解析, 但 DSH 气泡不会折叠成 chip.
- 双引号不在这层处理, 它由默认第二条规则负责; 两层都做会把规则产出的反斜杠再转义一次. 规则算出的名称就是模型最终看到的名称, wire 层的 `\` 与 `]` 转义会被 Host 原样还原.

## 配置

设置 -> Plugins -> `dsh-copy-session-ref` 的 bundle 页:

- 增删规则, 调整顺序, 勾选启用, 修改正则 / flags / 替换文本.
- 表单是暂存语义: 保存才写入 profile 的 patch 层, 离开页面丢弃未保存的编辑.
- 复制时读的是已保存的值, 表单里未保存的编辑不参与.
- 正则或 flags 非法时表单标红并阻止保存.

规则也写在插件自己的 Config schema 里, 可以先看 [cordis.patch.yml](cordis.patch.yml) 的注释了解如何在 patch 层覆盖.

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

改完 Client 产物或 bundle metadata 后需要重启 `dsh web`, 因为 Client metadata 的扫描结果会在进程内缓存.

## 开发

```shell
just typecheck
just test
just build
just check-client
```

`just verify` 会依次跑完以上四步.

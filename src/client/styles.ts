/** 规则表单的样式. 自建构建没有官方 CSS 预设, 这里按官方预设的做法注入一个带标记的 style 标签. */

const STYLE_ATTR = 'data-plugin-css'
const STYLE_ID = 'dsh-copy-session-ref/rules-form.css'

const CSS_TEXT = `
.dcsr-intro {
  margin: 0;
  padding: 4px 0 12px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--dsw-alias-label-tertiary);
}

.dcsr-list {
  display: flex;
  flex-direction: column;
}

/* 列宽只在这里定义一次; 表头与数据行共用同一组类, 因此天然对齐. */
.dcsr-head,
.dcsr-line {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dcsr-check {
  flex: none;
  width: 72px;
}

.dcsr-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 2px;
  flex: none;
  /* 三个 28px 图标按钮 (16px 图标 + 左右各 10px 内边距) 加两个 2px 间隙. */
  width: 112px;
}

.dcsr-field {
  flex: 1 1 0;
  min-width: 0;
}

.dcsr-pattern {
  flex-grow: 1.8;
}

.dcsr-flags {
  flex-grow: 0.6;
  min-width: 68px;
}

.dcsr-replacement {
  flex-grow: 1;
  min-width: 110px;
}

.dcsr-head {
  padding: 0 0 6px;
  border-bottom: 0.5px solid var(--dsw-alias-border-l2);
}

.dcsr-head-text {
  font-size: 12px;
  line-height: 1.5;
  color: var(--dsw-alias-label-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 行内只保留复选框: '启用' 已经在表头里, 标签文字只留给读屏. */
.dcsr-line > label > span {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

/* 一条规则一行, 行间只用细分割线, 不套卡片. */
.dcsr-rule {
  display: flex;
  flex-direction: column;
  border-bottom: 0.5px solid var(--dsw-alias-border-l2);
}

.dcsr-rule:last-child {
  border-bottom: none;
}

.dcsr-line {
  padding: 8px 0;
}

.dcsr-line .dcsr-invalid {
  border-color: var(--dsw-alias-state-error-primary);
}

.dcsr-error {
  margin: 0 0 8px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--dsw-alias-state-error-primary);
}

.dcsr-add {
  display: flex;
  padding-top: 12px;
}

/* 预览: 示例标题可编辑, 右侧给出按当前草稿规则算出的名称. */
.dcsr-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 8px 10px;
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-3);
}

.dcsr-preview-label {
  flex: none;
  font-size: 12px;
  line-height: 1.5;
  color: var(--dsw-alias-label-tertiary);
}

.dcsr-sample {
  flex: none;
  width: 200px;
}

.dcsr-arrow {
  flex: none;
  font-size: 13px;
  color: var(--dsw-alias-label-tertiary);
}

.dcsr-preview-out {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--dsw-alias-label-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 窄屏没有列可对齐: 收起表头, 字段各占一行, 并把 '启用' 文字还给复选框. */
@media (max-width: 560px) {
  .dcsr-head {
    display: none;
  }

  .dcsr-line {
    flex-wrap: wrap;
  }

  .dcsr-check {
    width: auto;
  }

  .dcsr-field {
    flex: 1 1 100%;
  }

  .dcsr-line > label > span {
    position: static;
    width: auto;
    height: auto;
    margin: 0;
    overflow: visible;
    clip-path: none;
    white-space: normal;
  }

  .dcsr-preview {
    flex-wrap: wrap;
  }

  .dcsr-sample {
    flex: 1 1 140px;
    width: auto;
  }
}

/* 会话行 hover 卡片里的复制引用行.
   卡片表面在深浅主题下都是 #2C2C2E, 所以这里跟卡片本体一样用字面浅灰,
   而不是会随主题翻转的语义 token. */
.dcsr-hover-copy {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  margin: 0;
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  font-size: 12px;
  line-height: 16px;
  color: #CFD3D6;
  text-align: left;
  cursor: pointer;
}

.dcsr-hover-copy:hover {
  color: #FFFFFF;
}

.dcsr-hover-copy:focus-visible {
  outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 2px;
  border-radius: 2px;
}

.dcsr-hover-copy-icon {
  flex: none;
  display: inline-flex;
  align-items: center;
  height: 16px;
}
`

/** 注入一次样式标签, 重复调用无副作用. */
export function injectStyles(): void {
  if (document.querySelector(`style[${STYLE_ATTR}="${STYLE_ID}"]`) !== null) return
  const tag = document.createElement('style')
  tag.dataset.pluginCss = STYLE_ID
  tag.textContent = CSS_TEXT
  document.head.append(tag)
}

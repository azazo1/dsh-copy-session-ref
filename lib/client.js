window.__ModuleLoader__.load({
	id: "dsh-copy-session-ref",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		let _deepseek_ai_dsh_client_store = require("@deepseek-ai/dsh-client-store");
		//#region src/shared.ts
		/** Host 与 Client 共用的命名规则定义与纯逻辑. */
		/** 插件包名; Client loader 注册 id 与 profile 条目 id 共用. */
		const PLUGIN_ID = "dsh-copy-session-ref";
		/** Config 字段: 有序命名替换规则. */
		const RULES_FIELD = "rules";
		/** 规则对象字段. */
		const RULE_ENABLED_FIELD = "enabled";
		const RULE_PATTERN_FIELD = "pattern";
		const RULE_FLAGS_FIELD = "flags";
		const RULE_REPLACEMENT_FIELD = "replacement";
		/**
		* 内置默认规则, 顺序即执行顺序:
		* 1. 连续空白折成 `-`.
		* 2. 名称里原有的双引号转义成 `\"`, 免得和外面的包裹引号混在一起.
		* 3. 最后才用双引号把名称整个包起来, 包裹引号本身不参与上一步的转义.
		* `raw title` 变成 `"raw-title"`; `my "cool" title` 变成 `"my-\"cool\"-title"`; 空标题变成 `""`.
		* 冻结后同时作为 Host schema 默认值与 Client 兜底值, 只读.
		*/
		const DEFAULT_RULES = Object.freeze([
			Object.freeze({
				enabled: true,
				pattern: "\\s+",
				flags: "gu",
				replacement: "-"
			}),
			Object.freeze({
				enabled: true,
				pattern: "\"",
				flags: "gu",
				replacement: "\\\""
			}),
			Object.freeze({
				enabled: true,
				pattern: "^([\\s\\S]*)$",
				flags: "u",
				replacement: "\"$1\""
			})
		]);
		/**
		* 判断一条规则为何不能编译; 合法, 关闭或未填写 pattern 时两级都为空.
		* 关闭的规则与空 pattern 的规则在复制时会被跳过, 因此不算错误.
		* @param rule - 待检查的规则.
		* @returns 该规则的校验结果.
		*/
		function ruleIssues(rule) {
			if (!rule.enabled || rule.pattern === "") return {};
			try {
				new RegExp("", rule.flags);
			} catch (error) {
				return { flags: describeError(error) };
			}
			try {
				new RegExp(rule.pattern, rule.flags);
			} catch (error) {
				return { pattern: describeError(error) };
			}
			return {};
		}
		/**
		* 该规则是否有任何校验错误.
		* @param rule - 待检查的规则.
		* @returns 是否有错误.
		*/
		function hasRuleIssues(rule) {
			const issues = ruleIssues(rule);
			return issues.flags !== void 0 || issues.pattern !== void 0;
		}
		/** 把异常收成一行说明. */
		function describeError(error) {
			return error instanceof Error ? error.message : String(error);
		}
		/**
		* 编译一条规则; 关闭, 未填写或编译失败时返回 undefined.
		* @param rule - 待编译的规则.
		* @returns 可用的正则, 或 undefined.
		*/
		function compileRule(rule) {
			if (!rule.enabled || rule.pattern === "") return void 0;
			try {
				return new RegExp(rule.pattern, rule.flags);
			} catch {
				return;
			}
		}
		/**
		* 按顺序把规则作用到会话标题上.
		* 单条规则编译失败只跳过该条, 不影响其它规则.
		* @param label - 原始会话标题.
		* @param rules - 有序规则列表.
		* @returns 替换后的名称.
		*/
		function applyRules(label, rules) {
			let result = label;
			for (const rule of rules) {
				const regex = compileRule(rule);
				if (regex === void 0) continue;
				result = result.replace(regex, rule.replacement);
			}
			return result;
		}
		/**
		* 把 settings 里读到的未知结构收成人可用的规则列表; 结构异常时回退默认规则.
		* @param value - settings 表单快照里的 rules 字段.
		* @returns 规则列表.
		*/
		function decodeRules(value) {
			if (!Array.isArray(value)) return DEFAULT_RULES.map((rule) => ({ ...rule }));
			const rules = [];
			for (const item of value) {
				if (typeof item !== "object" || item === null) continue;
				const raw = item;
				rules.push({
					enabled: raw[RULE_ENABLED_FIELD] !== false,
					pattern: typeof raw["pattern"] === "string" ? raw[RULE_PATTERN_FIELD] : "",
					flags: typeof raw["flags"] === "string" ? raw[RULE_FLAGS_FIELD] : "gu",
					replacement: typeof raw["replacement"] === "string" ? raw[RULE_REPLACEMENT_FIELD] : ""
				});
			}
			return rules;
		}
		//#endregion
		//#region src/mention.ts
		/** Canonical session URI scheme used by session-reference. */
		const SESSION_REFERENCE_SCHEME = "dsh-session:";
		/**
		* Encode a session id as the canonical lossless `dsh-session:` URI.
		* @param sessionId - opaque session id.
		* @returns canonical URI.
		*/
		function encodeSessionReferenceUri(sessionId) {
			const json = JSON.stringify(sessionId);
			const bytes = new TextEncoder().encode(json);
			let binary = "";
			for (const byte of bytes) binary += String.fromCharCode(byte);
			const payload = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
			return `${SESSION_REFERENCE_SCHEME}${payload}`;
		}
		/**
		* Make a display label safe inside the wire mention `@[label](uri)`.
		*
		* Minimal on purpose: the label grammar is delimited by `]` and escapes with
		* `\`, so only those two characters are escaped. Line breaks and tabs become
		* spaces because a mention is an inline token, not a block. A double quote is
		* not special to that grammar and is left alone here on purpose: the naming
		* rules own the quoted-name style and the default set escapes the name's own
		* quotes before wrapping the name in quotes, so escaping quotes again at this
		* layer would double every backslash that rule produced.
		* @param label - label produced by the configured naming rules.
		* @returns the label as the wire form spells it.
		*/
		function escapeMentionLabel(label) {
			return label.replace(/[\r\n\t]+/gu, " ").replace(/[\\\]]/gu, (match) => `\\${match}`);
		}
		/**
		* Render the host-neutral Markdown mention the composer and Host both parse.
		* @param sessionId - opaque session id.
		* @param label - user-facing title after the naming rules ran.
		* @returns `@[label](dsh-session:...)` mention.
		*/
		function formatSessionReferenceMention(sessionId, label) {
			return `@[${escapeMentionLabel(label)}](${encodeSessionReferenceUri(sessionId)})`;
		}
		//#endregion
		//#region src/client/copy-reference.ts
		/**
		* 把一次 "复制会话引用" 落成剪贴板写入.
		* 会话行菜单与会话行 hover 卡片两个入口共用这里, 免得 mention 的拼法与
		* 剪贴板兜底各写一份.
		*/
		/**
		* 拼出规范 mention 并写入剪贴板.
		* @param session - 要引用的会话.
		* @param formatTitle - 命名规则作用在标题上的格式化函数.
		* @returns 是否写入成功.
		*/
		async function copySessionReference(session, formatTitle) {
			const mention = formatSessionReferenceMention(session.id, formatTitle(session.label));
			try {
				await writeClipboard(mention);
				return true;
			} catch {
				return false;
			}
		}
		/**
		* 复制文本到剪贴板, 没有 Clipboard API 时回落到隐藏 textarea.
		* @param text - 要复制的 mention.
		*/
		async function writeClipboard(text) {
			if (navigator.clipboard?.writeText !== void 0) {
				await navigator.clipboard.writeText(text);
				return;
			}
			const area = document.createElement("textarea");
			area.value = text;
			area.setAttribute("readonly", "");
			area.style.position = "fixed";
			area.style.left = "-9999px";
			document.body.append(area);
			area.select();
			const ok = document.execCommand("copy");
			area.remove();
			if (!ok) throw new Error("copy failed");
		}
		/**
		* 复制引用并给出行内反馈.
		* @param onSettled - 反馈结束时的收尾动作; 菜单行用它关掉菜单.
		* @returns 当前状态与触发复制的函数.
		*/
		function useCopyFeedback(onSettled) {
			const [phase, setPhase] = (0, react.useState)("idle");
			const timer = (0, react.useRef)(void 0);
			(0, react.useEffect)(() => () => {
				window.clearTimeout(timer.current);
			}, []);
			return {
				phase,
				run: (target, formatTitle) => {
					window.clearTimeout(timer.current);
					copySessionReference(target, formatTitle).then((ok) => {
						setPhase(ok ? "done" : "fail");
						timer.current = window.setTimeout(() => {
							setPhase("idle");
							onSettled?.();
						}, 500);
					});
				}
			};
		}
		//#endregion
		//#region src/client/sessions.ts
		/**
		* 把列表快照里的一行收成复制目标.
		* 空会话 (还没有第一条消息) 与查不到的行都没有可引用的身份.
		* @param row - 该 id 在快照里对应的行.
		* @returns 会话 id 与显示标题, 或 undefined.
		*/
		function sessionTarget(row) {
			if (row === void 0 || row.blank) return void 0;
			return {
				id: row.id,
				label: row.displayTitle
			};
		}
		//#endregion
		//#region src/client/hover-row.tsx
		/**
		* 会话行 hover 卡片里的 "复制引用" 行.
		*
		* 注册进 sidebar.session.row.hover, 会话身份由框架的 useSessions 给出.
		* 卡片本体是宿主的 role="button", 点它会复制会话标题, 所以这一行点击时
		* 阻断冒泡, 只写自己的引用, 不去改宿主行为.
		* 卡片表面在深浅主题下都是 #2C2C2E, 因此配色跟着卡片用字面浅灰.
		*/
		/**
		* 渲染复制引用行; 没有可引用的会话时不占位.
		* @param props - 会话 id, 注入面, 标准 hook 与字典.
		* @returns 可点击的一行, 或 null.
		*/
		function HoverCopyRow({ sessionId, formatTitle, useSessions, t }) {
			const { phase, run } = useCopyFeedback();
			const target = sessionTarget(useSessions((state) => state.byId[sessionId]));
			if (target === void 0) return null;
			const label = phase === "done" ? t("copied") : phase === "fail" ? t("copyFailed") : t("copy");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				className: "dcsr-hover-copy",
				"aria-label": t("copyAria", { name: target.label }),
				onClick: (event) => {
					event.preventDefault();
					event.stopPropagation();
					run(target, formatTitle);
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "dcsr-hover-copy-icon",
					"aria-hidden": "true",
					children: phase === "done" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCheckOutlineRegular, { size: 12 }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCopyOutlineRegular, { size: 12 })
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: label })]
			});
		}
		//#endregion
		//#region src/client/locales.ts
		/** 英文文案. */
		const en = {
			copy: "Copy reference",
			copied: "Copied",
			copyFailed: "Copy failed",
			copyAria: "Copy reference: {name}",
			summary: "Naming rules for copied session references",
			intro: "One rule per row, left to right: pattern, flags and replacement text. The leading checkbox enables the rule and the trailing buttons reorder or remove it. Rules run in order over the session title; an empty pattern skips that rule, and one that does not compile is skipped when copying.",
			enabled: "Enabled",
			pattern: "Pattern",
			flags: "Flags",
			replacement: "Replace with",
			patternPlaceholder: "Regular expression",
			flagsPlaceholder: "flags, e.g. gu",
			replacementPlaceholder: "replacement, $1 and $& work",
			addRule: "Add rule",
			moveUp: "Move up",
			moveDown: "Move down",
			remove: "Remove",
			invalidRule: "Invalid regular expression",
			preview: "Preview",
			sampleTitle: "Sample title",
			sampleDefault: "raw session title",
			unavailable: "This plugin is not loaded, so it cannot be configured right now.",
			readOnly: "This deployment stores settings read-only.",
			saveFailed: "The deployment did not accept these values; they were left for you to correct.",
			save: "Save",
			saving: "Saving..."
		};
		/** 中文文案. */
		const zh = {
			copy: "复制引用",
			copied: "已复制",
			copyFailed: "复制失败",
			copyAria: "复制引用: {name}",
			summary: "复制引用时的命名规则",
			intro: "每行一条规则, 从左到右依次是正则, flags 与替换文本; 行首勾选启用, 行尾调整顺序或删除. 规则按顺序作用在会话标题上, 正则留空表示跳过该条, 编译失败的规则在复制时同样跳过.",
			enabled: "启用",
			pattern: "正则",
			flags: "flags",
			replacement: "替换为",
			patternPlaceholder: "正则表达式",
			flagsPlaceholder: "flags, 例如 gu",
			replacementPlaceholder: "替换文本, 可用 $1 与 $&",
			addRule: "新增规则",
			moveUp: "上移",
			moveDown: "下移",
			remove: "删除",
			invalidRule: "正则无效",
			preview: "预览",
			sampleTitle: "示例标题",
			sampleDefault: "会话 引用 命名",
			unavailable: "该插件当前未加载, 暂时无法配置.",
			readOnly: "本部署的设置为只读.",
			saveFailed: "本部署没有接受这些值, 已保留供你修改.",
			save: "保存",
			saving: "保存中..."
		};
		/**
		* 表单外框需要的文案.
		* @param t - 本插件字典的读取函数.
		* @returns SettingsForm 的 labels.
		*/
		function formLabels(t) {
			return {
				unavailable: t("unavailable"),
				readOnly: t("readOnly"),
				saveFailed: t("saveFailed"),
				save: t("save"),
				saving: t("saving")
			};
		}
		//#endregion
		//#region src/client/menu-row.tsx
		/**
		* 会话行 "..." 菜单里的 "复制引用" 行.
		*
		* 注册进 sidebar.workspaces.session.menu.item: 会话身份与行标题由 owner props
		* 给出 (宿主传的就是行上显示的标题), 关菜单用 slot 声明的 useMenuOpenState,
		* 行本身用 ui-primitives 的 MenuItemButton, 与宿主自己的 pin / rename /
		* fork / archive 同款. 复制反馈结束后才关菜单, 让 "已复制" 有机会被看到.
		*/
		/**
		* 渲染菜单里的复制引用行.
		* @param props - 会话 id, 行标题, 注入面, 菜单 hook 与字典.
		* @returns 一行菜单项.
		*/
		function MenuCopyRow({ sessionId, displayTitle, formatTitle, useMenuOpenState, t }) {
			const [, setMenuOpen] = useMenuOpenState();
			const { phase, run } = useCopyFeedback(() => {
				setMenuOpen(false);
			});
			const label = phase === "done" ? t("copied") : phase === "fail" ? t("copyFailed") : t("copy");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.MenuItemButton, {
				icon: phase === "done" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCheckOutlineRegular, { size: 14 }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCopyOutlineRegular, { size: 14 }),
				onSelect: () => {
					run({
						id: sessionId,
						label: displayTitle
					}, formatTitle);
				},
				children: label
			});
		}
		//#endregion
		//#region src/client/rules-controller.ts
		/** 规则表单的暂存控制器: 编辑只落本地草稿, 保存才写回 settings. */
		/**
		* 把一行移到相邻位置.
		* @param rows - 当前行.
		* @param id - 要移动的行的 id.
		* @param delta - -1 上移, 1 下移.
		* @returns 新行数组; 越界时原样返回.
		*/
		function moveRow(rows, id, delta) {
			const index = rows.findIndex((row) => row.id === id);
			const target = index + delta;
			if (index < 0 || target < 0 || target >= rows.length) return rows;
			const next = [...rows];
			const [row] = next.splice(index, 1);
			next.splice(target, 0, row);
			return next;
		}
		/** 草稿规则写回配置时的纯对象形态. */
		function toRule(row) {
			return {
				enabled: row.enabled,
				pattern: row.pattern,
				flags: row.flags,
				replacement: row.replacement
			};
		}
		/** 命名规则的暂存表单. */
		var RulesController = class {
			form;
			store;
			unsubscribe;
			rows;
			nextId = 1;
			edited = false;
			saving = false;
			failed = false;
			baseline;
			/** @param form - 本插件 profile 条目的共享配置表单. */
			constructor(form) {
				this.form = form;
				this.rows = this.rowsFrom(this.savedRules());
				this.store = (0, _deepseek_ai_dsh_client_store.createSnapshotStore)(this.projection());
				this.unsubscribe = form.subscribe(() => {
					if (!this.edited) this.rows = this.rowsFrom(this.savedRules());
					this.publish();
				});
			}
			/**
			* 复制时使用的规则: 只认已保存的值, 表单里未保存的编辑不参与.
			* @returns 规则列表.
			*/
			rules() {
				return this.savedRules();
			}
			/**
			* 构造 slot 注册要注入的面.
			* @returns 快照 hook 与编辑动作.
			*/
			inject() {
				return {
					hooks: { rulesForm: this.store },
					...this.actions()
				};
			}
			/** 释放对配置表单的订阅. */
			dispose() {
				this.unsubscribe();
			}
			/** 保存草稿; 有非法规则或不可写时不做任何事. */
			async save() {
				const snapshot = this.form.getSnapshot();
				if (!this.edited || this.saving || !snapshot.writable) return;
				if (this.rows.some((row) => hasRuleIssues(row))) return;
				this.saving = true;
				this.failed = false;
				this.publish();
				try {
					const landed = await this.form.mutate([{
						op: "set",
						path: [RULES_FIELD],
						value: this.rows.map(toRule)
					}], this.baseline);
					if (landed) {
						this.edited = false;
						this.baseline = void 0;
					} else this.baseline = void 0;
					this.failed = !landed;
				} catch {
					this.failed = true;
				} finally {
					this.saving = false;
					this.publish();
				}
			}
			/** 丢弃草稿, 回到已保存的规则. */
			discard() {
				this.edited = false;
				this.failed = false;
				this.baseline = void 0;
				this.rows = this.rowsFrom(this.savedRules());
				this.publish();
			}
			actions() {
				return {
					addRule: () => {
						this.mutateRows((rows) => [...rows, {
							id: this.nextId++,
							enabled: true,
							pattern: "",
							flags: "gu",
							replacement: ""
						}]);
					},
					editRule: (id, patch) => {
						this.mutateRows((rows) => rows.map((row) => row.id === id ? {
							...row,
							...patch
						} : row));
					},
					moveRule: (id, delta) => {
						this.mutateRows((rows) => moveRow(rows, id, delta));
					},
					removeRule: (id) => {
						this.mutateRows((rows) => rows.filter((row) => row.id !== id));
					},
					save: () => {
						this.save();
					},
					discard: () => {
						this.discard();
					}
				};
			}
			mutateRows(next) {
				this.baseline ??= this.form.getSnapshot().revision;
				this.edited = true;
				this.failed = false;
				this.rows = next(this.rows);
				this.publish();
			}
			savedRules() {
				return decodeRules(this.form.getSnapshot().value?.[RULES_FIELD]);
			}
			rowsFrom(rules) {
				return rules.map((rule) => ({
					...rule,
					id: this.nextId++
				}));
			}
			projection() {
				const snapshot = this.form.getSnapshot();
				return {
					available: snapshot.status === "ready",
					writable: snapshot.writable,
					dirty: this.edited,
					invalid: this.rows.some((row) => hasRuleIssues(row)),
					saving: this.saving,
					failed: this.failed,
					rules: this.rows.map((row) => {
						const issues = ruleIssues(row);
						return {
							...toRule(row),
							id: row.id,
							patternError: issues.pattern,
							flagsError: issues.flags
						};
					})
				};
			}
			publish() {
				this.store.set(this.projection());
			}
		};
		//#endregion
		//#region src/client/rules-form.tsx
		/**
		* 规则配置表单: 在 Plugins 页面本插件的 bundle 页上编辑命名规则.
		* 表头给出列名 (启用 | 正则 | flags | 替换), 一行一条规则, 行尾是上移 / 下移 / 删除.
		* 暂存语义: 保存才写入 profile 的配置层.
		*/
		/**
		* 给输入框拼上校验态类名.
		* @param name - 该字段的类名.
		* @param invalid - 是否处于校验失败状态.
		* @returns 传给 Input 的 className.
		*/
		function fieldClass(name, invalid) {
			return invalid ? `dcsr-field ${name} dcsr-invalid` : `dcsr-field ${name}`;
		}
		/**
		* 渲染规则表单.
		* @param props - 视图, 文案与控制器注入的快照和动作.
		* @returns 一行简介或完整表单.
		*/
		function RulesForm(props) {
			const { t } = props;
			const state = props.useRulesForm((snapshot) => snapshot);
			const [sample, setSample] = (0, react.useState)(() => t("sampleDefault"));
			if (props.view === "summary") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: t("summary") });
			const disabled = !state.writable || state.saving;
			const previewLabel = applyRules(sample, state.rules);
			const previewWire = `@[${escapeMentionLabel(previewLabel)}](dsh-session:...)`;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.SettingsForm, {
				labels: formLabels(t),
				state,
				onSave: props.save,
				onDiscard: props.discard,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dcsr-intro",
						children: t("intro")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dcsr-list",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dcsr-head",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dcsr-check dcsr-head-text",
									children: t("enabled")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dcsr-field dcsr-pattern dcsr-head-text",
									children: t("pattern")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dcsr-field dcsr-flags dcsr-head-text",
									children: t("flags")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dcsr-field dcsr-replacement dcsr-head-text",
									children: t("replacement")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dcsr-actions" })
							]
						}), state.rules.map((rule, index) => {
							const error = rule.patternError ?? rule.flagsError;
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dcsr-rule",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dcsr-line",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Checkbox, {
											className: "dcsr-check",
											checked: rule.enabled,
											label: t("enabled"),
											title: t("enabled"),
											disabled,
											onChange: (next) => {
												props.editRule(rule.id, { enabled: next });
											}
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
											className: fieldClass("dcsr-pattern", rule.patternError !== void 0),
											value: rule.pattern,
											placeholder: t("patternPlaceholder"),
											title: rule.patternError ?? t("pattern"),
											"aria-label": t("pattern"),
											"aria-invalid": rule.patternError === void 0 ? void 0 : true,
											disabled,
											onChange: (event) => {
												props.editRule(rule.id, { pattern: event.currentTarget.value });
											}
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
											className: fieldClass("dcsr-flags", rule.flagsError !== void 0),
											value: rule.flags,
											placeholder: t("flagsPlaceholder"),
											title: rule.flagsError ?? t("flags"),
											"aria-label": t("flags"),
											"aria-invalid": rule.flagsError === void 0 ? void 0 : true,
											disabled,
											onChange: (event) => {
												props.editRule(rule.id, { flags: event.currentTarget.value });
											}
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
											className: fieldClass("dcsr-replacement", false),
											value: rule.replacement,
											placeholder: t("replacementPlaceholder"),
											title: t("replacement"),
											"aria-label": t("replacement"),
											disabled,
											onChange: (event) => {
												props.editRule(rule.id, { replacement: event.currentTarget.value });
											}
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: "dcsr-actions",
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
													size: "sm",
													variant: "ghost",
													icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronUpOutlineRegular, { size: 16 }),
													"aria-label": t("moveUp"),
													title: t("moveUp"),
													disabled: disabled || index === 0,
													onClick: () => {
														props.moveRule(rule.id, -1);
													}
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
													size: "sm",
													variant: "ghost",
													icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutlineRegular, { size: 16 }),
													"aria-label": t("moveDown"),
													title: t("moveDown"),
													disabled: disabled || index === state.rules.length - 1,
													onClick: () => {
														props.moveRule(rule.id, 1);
													}
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
													size: "sm",
													variant: "ghost",
													icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconTrashOutlineRegular, { size: 16 }),
													"aria-label": t("remove"),
													title: t("remove"),
													disabled,
													onClick: () => {
														props.removeRule(rule.id);
													}
												})
											]
										})
									]
								}), error === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
									className: "dcsr-error",
									children: [
										t("invalidRule"),
										": ",
										error
									]
								})]
							}, rule.id);
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dcsr-add",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							size: "sm",
							variant: "outline",
							icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutlineRegular, { size: 16 }),
							disabled,
							onClick: props.addRule,
							children: t("addRule")
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dcsr-preview",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dcsr-preview-label",
								children: t("preview")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
								className: "dcsr-sample",
								value: sample,
								placeholder: t("sampleTitle"),
								title: t("sampleTitle"),
								"aria-label": t("sampleTitle"),
								onChange: (event) => {
									setSample(event.currentTarget.value);
								}
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dcsr-arrow",
								"aria-hidden": "true",
								children: "→"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
								className: "dcsr-preview-out",
								title: previewWire,
								children: `@${previewLabel}`
							})
						]
					})
				]
			});
		}
		//#endregion
		//#region src/client/styles.ts
		/** 规则表单的样式. 自建构建没有官方 CSS 预设, 这里按官方预设的做法注入一个带标记的 style 标签. */
		const STYLE_ATTR = "data-plugin-css";
		const STYLE_ID = "dsh-copy-session-ref/rules-form.css";
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
`;
		/** 注入一次样式标签, 重复调用无副作用. */
		function injectStyles() {
			if (document.querySelector(`style[${STYLE_ATTR}="${STYLE_ID}"]`) !== null) return;
			const tag = document.createElement("style");
			tag.dataset.pluginCss = STYLE_ID;
			tag.textContent = CSS_TEXT;
			document.head.append(tag);
		}
		//#endregion
		//#region src/client/index.ts
		/** 本插件字典的命名空间, 与包名一致. */
		const LOCALE_NS = PLUGIN_ID;
		/** Client factory 等这些服务就绪后再装配. */
		const inject = [
			"locale",
			"slots",
			"configForms"
		];
		/**
		* 挂上命名规则表单, 并注册菜单与 hover 卡片两个复制引用入口.
		* 两个入口的会话身份都由框架给出, 插件不解析 DOM.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(LOCALE_NS, {
				zh,
				en
			}), "dsh-copy-session-ref: dictionaries");
			injectStyles();
			const controller = new RulesController(ctx.configForms.get(PLUGIN_ID));
			ctx.effect(() => () => {
				controller.dispose();
			}, "dsh-copy-session-ref: rules form");
			ctx.effect(() => ctx.configForms.whileServed([PLUGIN_ID], () => ctx.slots.inject("plugins.bundle.config", () => ctx.slots.register({
				name: "plugins.bundle.config",
				key: PLUGIN_ID,
				locale: LOCALE_NS,
				inject: () => controller.inject()
			}, RulesForm))), "dsh-copy-session-ref: rules page");
			const formatTitle = (title) => applyRules(title, controller.rules());
			ctx.effect(() => ctx.slots.inject("sidebar.workspaces.session.menu.item", () => ctx.slots.register({
				name: "sidebar.workspaces.session.menu.item",
				id: PLUGIN_ID,
				order: 500,
				locale: LOCALE_NS,
				inject: () => ({ formatTitle })
			}, MenuCopyRow)), "dsh-copy-session-ref: session menu row");
			ctx.effect(() => ctx.slots.inject("sidebar.session.row.hover", () => ctx.slots.register({
				name: "sidebar.session.row.hover",
				id: PLUGIN_ID,
				order: 5,
				locale: LOCALE_NS,
				inject: () => ({ formatTitle })
			}, HoverCopyRow)), "dsh-copy-session-ref: hover card row");
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

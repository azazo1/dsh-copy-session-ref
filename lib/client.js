window.__ModuleLoader__.load({
	id: "dsh-copy-session-ref",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
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
		* Render the host-neutral Markdown mention the composer and Host both parse.
		* @param sessionId - opaque session id.
		* @param label - user-facing title.
		* @returns `@[label](dsh-session:...)` mention.
		*/
		function formatSessionReferenceMention(sessionId, label) {
			return `@[${label.replace(/[\\\]]/gu, (match) => `\\${match}`)}](${encodeSessionReferenceUri(sessionId)})`;
		}
		//#endregion
		//#region src/client/menu.ts
		const ITEM_ATTR = "data-dsh-copy-session-ref";
		const COPY_SVG = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" viewBox=\"0 0 16 16\" fill=\"none\" aria-hidden=\"true\"><rect x=\"5.5\" y=\"5.5\" width=\"8\" height=\"8\" rx=\"1.5\" stroke=\"currentColor\"/><path d=\"M10.5 5.5V3.5A1 1 0 0 0 9.5 2.5h-6A1 1 0 0 0 2.5 3.5v6a1 1 0 0 0 1 1h2\" stroke=\"currentColor\"/></svg>";
		const SESSION_MENU_LABELS = /* @__PURE__ */ new Set([
			"重命名",
			"Rename",
			"分叉会话",
			"Fork session",
			"归档会话",
			"Archive session"
		]);
		/**
		* Whether this portaled menu is a session-row action menu.
		* @param menu - a `[role=menu]` element.
		* @returns true when rename / fork / archive are all present.
		*/
		function isSessionMenu(menu) {
			const labels = [...menu.querySelectorAll("[role=\"menuitem\"]")].map((node) => node.textContent?.trim() ?? "").filter((label) => label !== "");
			if (labels.some((label) => label === "复制引用" || label === "Copy reference" || label === "已复制" || label === "Copied")) return labels.filter((label) => SESSION_MENU_LABELS.has(label)).length >= 3;
			return labels.includes("重命名") && labels.includes("分叉会话") && labels.includes("归档会话") || labels.includes("Rename") && labels.includes("Fork session") && labels.includes("Archive session");
		}
		/**
		* Append a copy-reference row to an open session menu.
		* @param menu - portaled `[role=menu]`.
		* @param session - session resolved from the ellipsis click.
		*/
		function enhanceSessionMenu(menu, session) {
			if (menu.querySelector(`[${ITEM_ATTR}]`) !== null) return;
			if (!isSessionMenu(menu)) return;
			const sample = menu.querySelector("[role=\"menuitem\"]");
			if (!(sample instanceof HTMLElement)) return;
			const wrap = sample.parentElement;
			const list = wrap?.parentElement;
			if (wrap === null || list === void 0 || list === null) return;
			const cloneWrap = wrap.cloneNode(true);
			cloneWrap.setAttribute(ITEM_ATTR, "");
			const button = cloneWrap.querySelector("[role=\"menuitem\"]");
			if (!(button instanceof HTMLButtonElement)) return;
			button.removeAttribute("aria-haspopup");
			button.removeAttribute("aria-expanded");
			button.disabled = false;
			const spans = [...button.querySelectorAll(":scope > span")];
			const labelSpan = spans.at(-1) ?? button;
			const iconSpan = spans.length > 1 ? spans[0] : void 0;
			const chinese = [...menu.querySelectorAll("[role=\"menuitem\"]")].some((node) => node.textContent?.trim() === "重命名");
			const idleLabel = chinese ? "复制引用" : "Copy reference";
			const doneLabel = chinese ? "已复制" : "Copied";
			const failLabel = chinese ? "复制失败" : "Copy failed";
			labelSpan.textContent = idleLabel;
			if (iconSpan !== void 0) iconSpan.innerHTML = COPY_SVG;
			button.addEventListener("click", (event) => {
				event.preventDefault();
				event.stopPropagation();
				copyMention(session, labelSpan, idleLabel, doneLabel, failLabel);
			});
			list.append(cloneWrap);
		}
		/**
		* Write the canonical mention and briefly confirm on the menu row.
		* @param session - copied session.
		* @param labelSpan - visible label node.
		* @param idleLabel - original label.
		* @param doneLabel - success label.
		* @param failLabel - failure label.
		*/
		async function copyMention(session, labelSpan, idleLabel, doneLabel, failLabel) {
			const mention = formatSessionReferenceMention(session.id, session.label);
			try {
				await writeClipboard(mention);
				labelSpan.textContent = doneLabel;
			} catch {
				labelSpan.textContent = failLabel;
			}
			window.setTimeout(() => {
				labelSpan.textContent = idleLabel;
				document.dispatchEvent(new KeyboardEvent("keydown", {
					key: "Escape",
					bubbles: true
				}));
			}, 500);
		}
		/**
		* Copy text to the clipboard, falling back to a hidden textarea.
		* @param text - mention to copy.
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
		//#endregion
		//#region src/client/sessions.ts
		const ZH_ACTIONS = /^会话[“"](.+)[”"]的操作$/u;
		const EN_ACTIONS = /^Session actions for (.+)$/u;
		/**
		* Read the session title encoded in the row action button aria-label.
		* @param ariaLabel - `aria-label` of the ellipsis button.
		* @returns title, or undefined when this is not a session-row action.
		*/
		function titleFromActionLabel(ariaLabel) {
			return ZH_ACTIONS.exec(ariaLabel)?.[1] ?? EN_ACTIONS.exec(ariaLabel)?.[1];
		}
		/**
		* Map the clicked session-row action button to a listed session.
		* Same-title rows are disambiguated by selected state, then by DOM order
		* among matching action buttons versus matching listed sessions.
		* @param button - the ellipsis button that opened the menu.
		* @param list - live session list snapshot source.
		* @returns session id and display label, or undefined when unresolved.
		*/
		function resolveSession(button, list) {
			const title = titleFromActionLabel(button.getAttribute("aria-label") ?? "");
			if (title === void 0) return void 0;
			const treeitem = button.closest("[role=\"treeitem\"]");
			if (!(treeitem instanceof HTMLElement)) return void 0;
			const snap = list.getSnapshot();
			const matches = snap.ids.map((id) => snap.byId[id]).filter((row) => row !== void 0 && !row.blank && row.displayTitle === title);
			if (matches.length === 0) return {
				id: title,
				label: title
			};
			if (matches.length === 1) return {
				id: matches[0].id,
				label: title
			};
			if (treeitem.getAttribute("aria-selected") === "true") {
				const current = matches.find((row) => row.id === snap.current);
				if (current !== void 0) return {
					id: current.id,
					label: title
				};
			}
			return {
				id: (matches[[...document.querySelectorAll("button[aria-label]")].filter((node) => {
					if (!(node instanceof HTMLElement)) return false;
					if (node.closest("[role=\"treeitem\"]") === null) return false;
					return titleFromActionLabel(node.getAttribute("aria-label") ?? "") === title;
				}).indexOf(button)] ?? matches[0]).id,
				label: title
			};
		}
		//#endregion
		//#region src/client/index.ts
		/** Client factory waits for the sessions service. */
		const inject = ["sessions"];
		/**
		* Watch session-row menus and inject a copy-reference action.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			const sessions = ctx.get("sessions");
			if (sessions === void 0) return;
			let pending;
			const onPointerDown = (event) => {
				const target = event.target;
				if (!(target instanceof Element)) return;
				const button = target.closest("button[aria-label]");
				if (!(button instanceof HTMLElement)) return;
				pending = resolveSession(button, sessions.list);
			};
			const scan = () => {
				if (pending === void 0) return;
				for (const node of document.querySelectorAll("[role=\"menu\"]")) if (node instanceof HTMLElement) enhanceSessionMenu(node, pending);
			};
			const observer = new MutationObserver(scan);
			ctx.effect(() => {
				document.addEventListener("pointerdown", onPointerDown, true);
				observer.observe(document.body, {
					childList: true,
					subtree: true
				});
				return () => {
					document.removeEventListener("pointerdown", onPointerDown, true);
					observer.disconnect();
				};
			}, "dsh-copy-session-ref: session menu");
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

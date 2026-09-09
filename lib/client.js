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
		const ANCHOR_GAP_PX = 160;
		/**
		* Whether this portaled menu has been placed next to the session ellipsis.
		* Hidden measure frames at 0,0 are ignored.
		* @param menu - a `[role=menu]` element.
		* @returns true when the menu is visible with a real box.
		*/
		function isPlacedMenu(menu) {
			if (getComputedStyle(menu).visibility === "hidden") return false;
			const box = menu.getBoundingClientRect();
			return box.width > 0 && box.height > 0;
		}
		/**
		* Whether a placed portal menu belongs to the clicked session action button.
		* @param menu - placed `[role=menu]`.
		* @param anchor - the ellipsis that opened it.
		* @returns true when the menu sits next to the button.
		*/
		function isMenuForAnchor(menu, anchor) {
			if (!isPlacedMenu(menu)) return false;
			const menuBox = menu.getBoundingClientRect();
			const anchorBox = anchor.getBoundingClientRect();
			const dx = Math.max(anchorBox.left - menuBox.right, menuBox.left - anchorBox.right, 0);
			const dy = Math.max(anchorBox.top - menuBox.bottom, menuBox.top - anchorBox.bottom, 0);
			return Math.hypot(dx, dy) <= ANCHOR_GAP_PX;
		}
		/**
		* Append a copy-reference row to an open session menu.
		* @param menu - portaled `[role=menu]`.
		* @param session - session resolved from the ellipsis click.
		* @param labels - visible copy-row strings.
		* @returns true when the menu already has the row or a row was inserted.
		*/
		function enhanceSessionMenu(menu, session, labels) {
			if (menu.querySelector(`[${ITEM_ATTR}]`) !== null) return true;
			const sample = menu.querySelector("[role=\"menuitem\"]");
			if (!(sample instanceof HTMLElement)) return false;
			const wrap = sample.parentElement;
			const list = wrap?.parentElement;
			if (wrap === null || list === void 0 || list === null) return false;
			const cloneWrap = wrap.cloneNode(true);
			cloneWrap.setAttribute(ITEM_ATTR, "");
			const button = cloneWrap.querySelector("[role=\"menuitem\"]");
			if (!(button instanceof HTMLButtonElement)) return false;
			button.removeAttribute("aria-haspopup");
			button.removeAttribute("aria-expanded");
			button.disabled = false;
			const spans = [...button.querySelectorAll(":scope > span")];
			const labelSpan = spans.at(-1) ?? button;
			const iconSpan = spans.length > 1 ? spans[0] : void 0;
			labelSpan.textContent = labels.idle;
			if (iconSpan !== void 0) iconSpan.innerHTML = COPY_SVG;
			button.addEventListener("click", (event) => {
				event.preventDefault();
				event.stopPropagation();
				copyMention(session, labelSpan, labels);
			});
			list.append(cloneWrap);
			return true;
		}
		/**
		* Write the canonical mention and briefly confirm on the menu row.
		* @param session - copied session.
		* @param labelSpan - visible label node.
		* @param labels - copy-row strings.
		*/
		async function copyMention(session, labelSpan, labels) {
			const mention = formatSessionReferenceMention(session.id, session.label);
			try {
				await writeClipboard(mention);
				labelSpan.textContent = labels.done;
			} catch {
				labelSpan.textContent = labels.fail;
			}
			window.setTimeout(() => {
				labelSpan.textContent = labels.idle;
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
		/**
		* Map the clicked session-row action button to a listed session.
		* Matches DSH's own `actions.session.aria` copy so language switches follow
		* the host dictionary. Same-title rows are disambiguated by selected state,
		* then by DOM order among matching action buttons.
		* @param button - the ellipsis button that opened the menu.
		* @param list - live session list snapshot source.
		* @param t - ui-workspace translator.
		* @returns session id and display label, or undefined when unresolved.
		*/
		function resolveSession(button, list, t) {
			const aria = button.getAttribute("aria-label");
			if (aria === null || aria === "") return void 0;
			const treeitem = button.closest("[role=\"treeitem\"]");
			if (!(treeitem instanceof HTMLElement)) return void 0;
			const snap = list.getSnapshot();
			const matches = snap.ids.map((id) => snap.byId[id]).filter((row) => row !== void 0 && !row.blank && t("actions.session.aria", { name: row.displayTitle }) === aria);
			if (matches.length === 0) return void 0;
			if (matches.length === 1) return {
				id: matches[0].id,
				label: matches[0].displayTitle
			};
			if (treeitem.getAttribute("aria-selected") === "true") {
				const current = matches.find((row) => row.id === snap.current);
				if (current !== void 0) return {
					id: current.id,
					label: current.displayTitle
				};
			}
			const hit = matches[[...document.querySelectorAll("button[aria-label]")].filter((node) => {
				if (!(node instanceof HTMLElement)) return false;
				if (node.closest("[role=\"treeitem\"]") === null) return false;
				return node.getAttribute("aria-label") === aria;
			}).indexOf(button)] ?? matches[0];
			return {
				id: hit.id,
				label: hit.displayTitle
			};
		}
		//#endregion
		//#region src/client/index.ts
		/** Client factory waits for sessions and the workspace locale dictionary. */
		const inject = ["sessions", "locale"];
		/**
		* Watch session-row menus and inject a copy-reference action.
		* The clicked ellipsis is the identity, not the host rename/fork/archive labels.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			const sessions = ctx.get("sessions");
			if (sessions === void 0) return;
			const t = ctx.locale.bind("workspace");
			let pending;
			const mount = () => {
				if (pending === void 0) return;
				const labels = copyLabels(t);
				for (const node of document.querySelectorAll("[role=\"menu\"]")) {
					if (!(node instanceof HTMLElement)) continue;
					if (!isMenuForAnchor(node, pending.anchor)) continue;
					if (enhanceSessionMenu(node, pending.session, labels)) pending = void 0;
					return;
				}
			};
			const onPointerDown = (event) => {
				const target = event.target;
				if (!(target instanceof Element)) return;
				const button = target.closest("button[aria-label]");
				if (!(button instanceof HTMLElement)) return;
				const session = resolveSession(button, sessions.list, t);
				pending = session === void 0 ? void 0 : {
					session,
					anchor: button
				};
				if (pending !== void 0) queueMicrotask(mount);
			};
			const observer = new MutationObserver(mount);
			ctx.effect(() => {
				document.addEventListener("pointerdown", onPointerDown, true);
				observer.observe(document.body, {
					childList: true,
					subtree: true,
					attributes: true,
					attributeFilter: ["style", "class"]
				});
				return () => {
					document.removeEventListener("pointerdown", onPointerDown, true);
					observer.disconnect();
				};
			}, "dsh-copy-session-ref: session menu");
		}
		/**
		* Copy-row strings. Default Chinese; English only when the host rename row is English.
		* @param t - ui-workspace translator, read at click time.
		* @returns visible labels.
		*/
		function copyLabels(t) {
			if (t("rename") === "Rename") return {
				idle: "Copy reference",
				done: "Copied",
				fail: "Copy failed"
			};
			return {
				idle: "复制引用",
				done: "已复制",
				fail: "复制失败"
			};
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//#region src/index.d.ts
/** Host half: this plugin only adds a Web session-menu action. */
declare const name = "dsh-copy-session-ref";
/** No Host behavior. Client injects the copy-reference menu item. */
declare function apply(): void;
//#endregion
export { apply, name };
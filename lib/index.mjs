//#region src/index.ts
/** Host half: this plugin only adds a Web session-menu action. */
const name = "dsh-copy-session-ref";
/** No Host behavior. Client injects the copy-reference menu item. */
function apply() {}
//#endregion
export { apply, name };

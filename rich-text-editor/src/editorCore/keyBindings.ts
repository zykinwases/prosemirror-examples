import { undo, redo } from 'prosemirror-history';
import { toggleMark, chainCommands, exitCode, setBlockType, joinUp, joinDown, lift, selectParentNode } from 'prosemirror-commands';
import { wrapInList, splitListItem, liftListItem, sinkListItem } from 'prosemirror-schema-list';
import { undoInputRule } from 'prosemirror-inputrules';
import { Schema } from 'prosemirror-model';
import { Command } from 'prosemirror-state';

const mac = typeof navigator != "undefined" ? /Mac|iP(hone|[oa]d)/.test(navigator.platform) : false;
/**
Inspect the given schema looking for marks and nodes from the
basic schema, and if found, add key bindings related to them.
This will add:

* **Mod-b** for toggling [strong](https://prosemirror.net/docs/ref/#schema-basic.StrongMark)
* **Mod-i** for toggling [emphasis](https://prosemirror.net/docs/ref/#schema-basic.EmMark)
* **Mod-`** for toggling [code font](https://prosemirror.net/docs/ref/#schema-basic.CodeMark)
* **Ctrl-Shift-0** for making the current textblock a paragraph
* **Ctrl-Shift-1** to **Ctrl-Shift-Digit6** for making the current
  textblock a heading of the corresponding level
* **Ctrl-Shift-Backslash** to make the current textblock a code block
* **Ctrl-Shift-8** to wrap the selection in an ordered list
* **Ctrl-Shift-9** to wrap the selection in a bullet list
* **Ctrl->** to wrap the selection in a block quote
* **Enter** to split a non-empty textblock in a list item while at
  the same time splitting the list item
* **Mod-Enter** to insert a hard break
* **Mod-_** to insert a horizontal rule
* **Backspace** to undo an input rule
* **Alt-ArrowUp** to `joinUp`
* **Alt-ArrowDown** to `joinDown`
* **Mod-BracketLeft** to `lift`
* **Escape** to `selectParentNode`

You can suppress or map these bindings by passing a `mapKeys`
argument, which maps key names (say `"Mod-B"` to either `false`, to
remove the binding, or a new key name string.
*/
function buildKeymap(schema: Schema, mapKeys?: { [x: string]: string; }) {
    let keys: {[x: string]: Command} = {};

    function bind(key: string, cmd: Command) {
        if (mapKeys) {
            let mapped = mapKeys[key];
            if (mapped === "false")
                return;
            if (mapped)
                key = mapped;
        }
        keys[key] = cmd;
    }

    bind("Mod-z", undo);
    bind("Shift-Mod-z", redo);
    bind("Backspace", undoInputRule);
    if (!mac)
        bind("Mod-y", redo);
    // непонятно две работают или нет
    bind("Alt-ArrowUp", joinUp);
    bind("Alt-ArrowDown", joinDown);
    bind("Mod-BracketLeft", lift);
    bind("Escape", selectParentNode);
    bind("Mod-b", toggleMark(schema.marks.strong));
    bind("Mod-B", toggleMark(schema.marks.strong));
    bind("Mod-i", toggleMark(schema.marks.em));
    bind("Mod-I", toggleMark(schema.marks.em));
    // делает из просто текста нумерованный список (но только из простого)
    bind("Shift-Ctrl-8", wrapInList(schema.nodes.bullet_list));
    // делает из просто текста маркированный список (но только из простого)
    bind("Shift-Ctrl-9", wrapInList(schema.nodes.ordered_list));
    // перенос строки внутри параграфа (нам не нужно, кажется)
    let br = schema.nodes.hard_break, cmd = chainCommands(exitCode, (state, dispatch) => {
        if (dispatch)
            dispatch(state.tr.replaceSelectionWith(br.create()).scrollIntoView());
        return true;
    });
    bind("Mod-Enter", cmd);
    bind("Shift-Enter", cmd);
    if (mac)
        bind("Ctrl-Enter", cmd);
    // увеличение/уменьшение вложенности списка и появление нового элемента списка при enter
    bind("Enter", splitListItem(schema.nodes.list_item));
    bind("Mod-[", liftListItem(schema.nodes.list_item));
    bind("Mod-]", sinkListItem(schema.nodes.list_item));
    bind("Shift-Ctrl-0", setBlockType(schema.nodes.paragraph));
    for (let i = 1; i <= 6; i++)
        bind("Shift-Ctrl-" + i, setBlockType(schema.nodes.heading, { level: i }));
    bind("Mod-_", (state, dispatch) => {
        if (dispatch)
            dispatch(state.tr.replaceSelectionWith(schema.nodes.horizontal_rule.create()).scrollIntoView());
        return true;
    });
    return keys;
}

export { buildKeymap }
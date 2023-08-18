import { toggleMark } from 'prosemirror-commands';
import { Command, EditorState, NodeSelection } from 'prosemirror-state';
import { icons, MenuItemSpec, MenuItem, MenuElement, wrapItem, blockTypeItem, Dropdown, DropdownSubmenu, joinUpItem, liftItem, selectParentNodeItem, undoItem, redoItem, IconSpec } from 'prosemirror-menu';
import { wrapInList } from 'prosemirror-schema-list';
import { insertPoint } from 'prosemirror-transform'
import { Fragment, Schema, MarkType, NodeType, Attrs } from 'prosemirror-model'
import { alignParagraph } from './commands';
import { openPrompt, TextField } from './prompt';

// Helpers to create specific types of items
function canInsert(state: EditorState, nodeType: NodeType) {
    let $from = state.selection.$from;
    for (let d = $from.depth; d >= 0; d--) {
        let index = $from.index(d);
        if ($from.node(d).canReplaceWith(index, index, nodeType))
            return true;
    }
    return false;
}
// элемент меню - вставка картинки
function insertImageItem(nodeType: NodeType) {
    return new MenuItem({
        title: "Insert image",
        label: "Image",
        enable(state) { return canInsert(state, nodeType); },
        run(state, _, view) {
            let { from, to } = state.selection, attrs = null;
            if (state.selection instanceof NodeSelection && state.selection.node.type === nodeType)
                attrs = state.selection.node.attrs;
            openPrompt({
                title: "Insert image",
                fields: {
                    src: new TextField({ label: "Location", required: true, value: attrs && attrs.src }),
                    title: new TextField({ label: "Title", value: attrs && attrs.title }),
                    alt: new TextField({ label: "Description",
                        value: attrs ? attrs.alt : state.doc.textBetween(from, to, " ") })
                },
                callback(attrs: Attrs | null | undefined) {
                    let node = nodeType.createAndFill(attrs);
                    if (node)
                        view.dispatch(view.state.tr.replaceSelectionWith(node));
                    view.focus();
                }
            });
        }
    });
}
// элемент меню, задающий команду
function cmdItem(cmd: Command, options: {[x: string]: any}) {
    let passedOptions: {[x: string]: any} = {
        label: options.title,
        run: cmd
    };
    for (let prop in options)
        passedOptions[prop] = options[prop];
    if (!options.enable && !options.select)
        passedOptions[options.enable ? "enable" : "select"] = (state: EditorState) => cmd(state);
    return new MenuItem(passedOptions as MenuItemSpec);
}
// active-функция для пометки
function markActive(state: EditorState, type: MarkType) {
    let { from, $from, to, empty } = state.selection;
    if (empty)
        return !!type.isInSet(state.storedMarks || $from.marks());
    else
        return state.doc.rangeHasMark(from, to, type);
}
// элемент меню, у которого действие -- поставить пометку
function markItem(markType: MarkType, options: { [x: string]: any; title?: string; icon?: IconSpec; }) {
    let passedOptions: {[x: string]: any} = {
        active(state: EditorState) { return markActive(state, markType); }
    };
    for (let prop in options)
        passedOptions[prop] = options[prop];
    return cmdItem(toggleMark(markType), passedOptions);
}
// элемент меню, отвечающий за создание ссылки (с всплывающим окошком)
function linkItem(markType: MarkType) {
    return new MenuItem({
        title: "Add or remove link",
        icon: icons.link,
        active(state) { return markActive(state, markType); },
        enable(state) { return !state.selection.empty; },
        run(state, dispatch, view) {
            if (markActive(state, markType)) {
                toggleMark(markType)(state, dispatch);
                return true;
            }
            openPrompt({
                title: "Create a link",
                fields: {
                    href: new TextField({
                        label: "Link target",
                        required: true
                    }),
                    title: new TextField({ label: "Title" })
                },
                callback(attrs: Attrs | null | undefined) {
                    toggleMark(markType, attrs)(view.state, view.dispatch);
                    view.focus();
                }
            });
        }
    });
}
function wrapListItem(nodeType: NodeType, options: {[x: string]: any} ) {
    return cmdItem(wrapInList(nodeType, options.attrs), options);
}

function alignParagraphItem(alignment: string, options: {[x: string]: any}) {
    return cmdItem(alignParagraph(alignment), options);
}

/**
Given a schema, look for default mark and node types in it and
return an object with relevant menu items relating to those marks.
*/
function buildMenuItems(schema: Schema): MenuElement[][] {
    let basicMenu: {[x: string]: MenuElement} = {}, blockMenu: {[x: string]: MenuElement[]} = {}, fullMenu: MenuElement[][];

    basicMenu.toggleStrong = markItem(schema.marks.strong, { title: "Toggle strong style", icon: icons.strong });
    basicMenu.toggleEm = markItem(schema.marks.em, { title: "Toggle emphasis", icon: icons.em });
    basicMenu.toggleLink = linkItem(schema.marks.link);
    
    basicMenu.toggleLeft = alignParagraphItem("left", { title: "L" })
    basicMenu.toggleCenter = alignParagraphItem("center", { title: "C" })
    basicMenu.toggleRight = alignParagraphItem("right", { title: "R" })

    basicMenu.insertImage = insertImageItem(schema.nodes.image);
    basicMenu.wrapBulletList = wrapListItem(schema.nodes.bullet_list, {
        title: "Wrap in bullet list",
        icon: icons.bulletList
    });
    basicMenu.wrapOrderedList = wrapListItem(schema.nodes.ordered_list, {
        title: "Wrap in ordered list",
        icon: icons.orderedList
    });
    basicMenu.wrapBlockQuote = wrapItem(schema.nodes.blockquote, {
        title: "Wrap in block quote",
        icon: icons.blockquote
    });
    basicMenu.makeParagraph = blockTypeItem(schema.nodes.paragraph, {
        title: "Change to paragraph",
        label: "Plain"
    });
    for (let i = 1; i <= 10; i++)
        basicMenu["makeHead" + i] = blockTypeItem(schema.nodes.heading, {
            title: "Change to heading " + i,
            label: "Level " + i,
            attrs: { level: i }
        });
    basicMenu.insertHorizontalRule = new MenuItem({
        title: "Insert horizontal rule",
        label: "Horizontal rule",
        enable(state) { return canInsert(state, schema.nodes.horizontal_rule); },
        run(state, dispatch) { dispatch(state.tr.replaceSelectionWith(schema.nodes.horizontal_rule.create())); }
    });
    basicMenu.insertFootnote = new MenuItem({
        title: "Insert footnote",
        label: "Footnote",
        select: function select(state) {
        return insertPoint(state.doc, state.selection.from, schema.nodes.footnote) != null
        },
        run: function run(state, dispatch) {
            var ref = state.selection;
            var empty = ref.empty;
            var $from = ref.$from;
            var $to = ref.$to;
            var content = Fragment.empty;
            if (!empty && $from.sameParent($to) && $from.parent.inlineContent)
                { content = $from.parent.content.cut($from.parentOffset, $to.parentOffset); }
            dispatch(state.tr.replaceSelectionWith(schema.nodes.footnote.create(null, content)));
        }
    })

    let cut = (arr: any) => arr.filter((x: any) => x);
    basicMenu.insertMenu = new Dropdown(cut([basicMenu.insertImage, basicMenu.insertHorizontalRule, basicMenu.insertFootnote]), { label: "Insert" });
    basicMenu.typeMenu = new Dropdown(cut([basicMenu.makeParagraph, basicMenu.makeCodeBlock, basicMenu.makeHead1 && new DropdownSubmenu(cut([
            basicMenu.makeHead1, basicMenu.makeHead2, basicMenu.makeHead3, basicMenu.makeHead4, basicMenu.makeHead5, basicMenu.makeHead6
        ]), { label: "Heading" })]), { label: "Type..." });

    blockMenu.inlineMenu = cut([basicMenu.toggleStrong, basicMenu.toggleEm, basicMenu.toggleCode, basicMenu.toggleLink]);
    blockMenu.blockMenu = [basicMenu.wrapBulletList, basicMenu.wrapOrderedList, basicMenu.wrapBlockQuote, joinUpItem, liftItem, selectParentNodeItem];
    blockMenu.alignMenu = [basicMenu.toggleLeft, basicMenu.toggleCenter, basicMenu.toggleRight]
    
    fullMenu = [blockMenu.inlineMenu, [basicMenu.insertMenu, basicMenu.typeMenu], [undoItem, redoItem], blockMenu.blockMenu, blockMenu.alignMenu];

    return fullMenu;
}

export { buildMenuItems };

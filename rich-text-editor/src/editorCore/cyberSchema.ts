import { Schema, NodeSpec, MarkSpec, Node } from 'prosemirror-model';

const blockquoteDOM = ["blockquote", 0], hrDOM = ["hr"], brDOM = ["br"];
const olDOM = ["ol", 0], ulDOM = ["ul", 0], liDOM = ["li", 0];
/**
[Specs](https://prosemirror.net/docs/ref/#model.NodeSpec) for the nodes defined in this schema.
*/
const nodes: NodeSpec = {
    /**
    NodeSpec The top level document node.
    */
    doc: {
        content: "block+",
    },
    /**
    A plain paragraph textblock. Represented in the DOM
    as a `<p>` element.
    */
    paragraph: {
        content: "inline*",
        group: "block",
        attrs: {
            textAlignment: { default: "" },
        },
        parseDOM: [{ tag: "p", getAttrs(dom: HTMLElement) {;
            return {textAlignment: dom.style.textAlign ? dom.style.textAlign : dom.getAttribute("align")}
        } }],
        toDOM(node: Node) { return ["p", {style: "text-align: " + node.attrs.textAlignment + ";"}, 0]; }
    },
    /**
    A blockquote (`<blockquote>`) wrapping one or more blocks.
    */
    blockquote: {
        content: "block+",
        group: "block",
        defining: true,
        parseDOM: [{ tag: "blockquote" }],
        toDOM() { return blockquoteDOM; }
    },
    /**
    A horizontal rule (`<hr>`).
    */
    horizontal_rule: {
        group: "block",
        parseDOM: [{ tag: "hr" }],
        toDOM() { return hrDOM; }
    },
    /**
    A heading textblock, with a `level` attribute that
    should hold the number 1 to 6. Parsed and serialized as `<h1>` to
    `<h6>` elements.
    */
    heading: {
        attrs: { level: { default: 1 } },
        content: "inline*",
        group: "block",
        defining: true,
        parseDOM: [{ tag: "h1", attrs: { level: 1 } },
            { tag: "h2", attrs: { level: 2 } },
            { tag: "h3", attrs: { level: 3 } },
            { tag: "h4", attrs: { level: 4 } },
            { tag: "h5", attrs: { level: 5 } },
            { tag: "h6", attrs: { level: 6 } }],
        toDOM(node: Node) { return ["h" + node.attrs.level, 0]; }
    },
    /**
    The text node.
    */
    text: {
        group: "inline"
    },
    /**
    An inline image (`<img>`) node. Supports `src`,
    `alt`, and `href` attributes. The latter two default to the empty
    string.
    */
    image: {
        inline: true,
        attrs: {
            src: {},
            alt: { default: null },
            title: { default: null }
        },
        group: "inline",
        draggable: true,
        parseDOM: [{ tag: "img[src]", getAttrs(dom: HTMLElement) {
                    return {
                        src: dom.getAttribute("src"),
                        title: dom.getAttribute("title"),
                        alt: dom.getAttribute("alt")
                    };
                } }],
        toDOM(node: Node) { let { src, alt, title } = node.attrs; return ["img", { src, alt, title }]; }
    },
    /**
    A hard line break, represented in the DOM as `<br>`.
    */
    hard_break: {
        inline: true,
        group: "inline",
        selectable: false,
        parseDOM: [{ tag: "br" }],
        toDOM() { return brDOM; }
    },

    ordered_list: {
        content: "list_item+",
        group: "block",
        attrs: { order: { default: 1 } },
        parseDOM: [{ tag: "ol", getAttrs(dom: HTMLElement) {
                    let attr = dom.getAttribute("start")
                    return { order: attr ? +attr : 1 };
                } }],
        toDOM(node: Node) {
            return node.attrs.order === 1 ? olDOM : ["ol", { start: node.attrs.order }, 0];
        }
    },
    /**
    A bullet list node spec, represented in the DOM as `<ul>`.
    */
    bullet_list: {
        content: "list_item+",
        group: "block",
        parseDOM: [{ tag: "ul" }],
        toDOM() { return ulDOM; }
    },
    /**
    A list item (`<li>`) spec.
    */
    list_item: {
        content: "paragraph block*",
        parseDOM: [{ tag: "li" }],
        toDOM() { return liDOM; },
        defining: true
    },

    footnote: {
        group: "inline",
        content: "inline*",
        inline: true,
        // This makes the view treat the node as a leaf, even though it
        // technically has content
        atom: true,
        toDOM: () => ["footnote", 0],
        parseDOM: [{tag: "footnote"}]
    },

};
const emDOM = ["em", 0], strongDOM = ["strong", 0];
/**
[Specs](https://prosemirror.net/docs/ref/#model.MarkSpec) for the marks in the schema.
*/
const marks: MarkSpec = {
    /**
    A link. Has `href` and `title` attributes. `title`
    defaults to the empty string. Rendered and parsed as an `<a>`
    element.
    */
    link: {
        attrs: {
            href: {},
            title: { default: null }
        },
        inclusive: false,
        parseDOM: [{ tag: "a[href]", getAttrs(dom: HTMLElement) {
                    return { href: dom.getAttribute("href"), title: dom.getAttribute("title") };
                } }],
        toDOM(node: Node) { let { href, title } = node.attrs; return ["a", { href, title }, 0]; }
    },
    /**
    An emphasis mark. Rendered as an `<em>` element. Has parse rules
    that also match `<i>` and `font-style: italic`.
    */
    em: {
        parseDOM: [{ tag: "i" }, { tag: "em" }, { style: "font-style=italic" }],
        toDOM() { return emDOM; }
    },
    /**
    A strong mark. Rendered as `<strong>`, parse rules also match
    `<b>` and `font-weight: bold`.
    */
    strong: {
        parseDOM: [{ tag: "strong" },
            // This works around a Google Docs misbehavior where
            // pasted content will be inexplicably wrapped in `<b>`
            // tags with a font-weight normal.
            { tag: "b", getAttrs: (node: HTMLElement) => node.style.fontWeight !== "normal" && null },
            { style: "font-weight", getAttrs: (value: string) => /^(bold(er)?|[5-9]\d{2,})$/.test(value) && null }],
        toDOM() { return strongDOM; }
    },
};
/**
This schema roughly corresponds to the document schema used by
[CommonMark](http://commonmark.org/), minus the list elements,
which are defined in the [`prosemirror-schema-list`](https://prosemirror.net/docs/ref/#schema-list)
module.

To reuse elements from this schema, extend or read from its
`spec.nodes` and `spec.marks` [properties](https://prosemirror.net/docs/ref/#model.Schema.spec).
*/
const cyberSchema = new Schema({ nodes, marks });

export { marks, nodes, cyberSchema };

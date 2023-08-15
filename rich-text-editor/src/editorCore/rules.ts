import { smartQuotes, ellipsis, emDash, wrappingInputRule, textblockTypeInputRule, inputRules } from 'prosemirror-inputrules';
import { NodeType, Schema } from 'prosemirror-model'
/**
Given a blockquote node type, returns an input rule that turns `"> "`
at the start of a textblock into a blockquote.
*/
function blockQuoteRule(nodeType: NodeType) {
    return wrappingInputRule(/^\s*>\s$/, nodeType);
}
/**
Given a list node type, returns an input rule that turns a number
followed by a dot at the start of a textblock into an ordered list.
*/
function orderedListRule(nodeType: NodeType) {
    return wrappingInputRule(/^(\d+)\.\s$/, nodeType, match => ({ order: +match[1] }), (match, node) => node.childCount + node.attrs.order === +match[1]);
}
/**
Given a list node type, returns an input rule that turns a bullet
(dash, plush, or asterisk) at the start of a textblock into a
bullet list.
*/
function bulletListRule(nodeType: NodeType) {
    return wrappingInputRule(/^\s*([-+*])\s$/, nodeType);
}
/**
Given a node type and a maximum level, creates an input rule that
turns up to that number of `#` characters followed by a space at
the start of a textblock into a heading whose level corresponds to
the number of `#` signs.
*/
function headingRule(nodeType: NodeType, maxLevel: number) {
    return textblockTypeInputRule(new RegExp("^(#{1," + maxLevel + "})\\s$"), nodeType, match => ({ level: match[1].length }));
}
/**
A set of input rules for creating the basic block quotes, lists,
code blocks, and heading.
*/
function buildInputRules(schema: Schema) {
    let rules = smartQuotes.concat(ellipsis, emDash);
    rules.push(blockQuoteRule(schema.nodes.blockquote));
    rules.push(orderedListRule(schema.nodes.ordered_list));
    rules.push(bulletListRule(schema.nodes.bullet_list));
    rules.push(headingRule(schema.nodes.heading, 6));
    return inputRules({ rules });
}

export { buildInputRules }

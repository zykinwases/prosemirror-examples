import { Node } from 'prosemirror-model'
import { Command, EditorState, TextSelection, Transaction } from 'prosemirror-state';

export function alignParagraph(alignment: string): Command {
    if ((alignment !== "right") && (alignment !== "center") && (alignment !== "left")) console.error("Wrong alignment");
    return function (state: EditorState, dispatch?: (tr: Transaction) => void) {
        let { ranges } = state.selection as TextSelection;

        if (dispatch) {
            let tr = state.tr, doc = state.doc;
            for (let i = 0; i < ranges.length; i++) {
                let { $from, $to } = ranges[i];
                doc.nodesBetween($from.pos, $to.pos, (node: Node, pos: number) => {
                    if (node.type !== state.schema.nodes.paragraph) return;
                    if (node.attrs.textAlignment !== alignment) {
                        tr.setNodeAttribute(pos, "textAlignment", alignment);
                    }
                })
            }
            dispatch(tr.scrollIntoView());
        }
        return true;
    }
}

import {StepMap} from "prosemirror-transform"
import {keymap} from "prosemirror-keymap"
import {undo, redo} from "prosemirror-history"
import { Node } from "prosemirror-model"
import { EditorView } from "prosemirror-view"
import { EditorState, Transaction } from "prosemirror-state"

declare type DOMNode = InstanceType<typeof window.Node>;

export class FootnoteView {
    node: Node
    outerView: EditorView
    getPos: () => number | undefined
    dom: HTMLElement
    innerView: EditorView | null

    constructor(node: Node, view: EditorView, getPos: () => number | undefined) {
        // We'll need these later
        this.node = node
        this.outerView = view
        this.getPos = getPos

        // The node's representation in the editor (empty, for now)
        this.dom = document.createElement("footnote")
        // These are used when the footnote is selected
        this.innerView = null;
    }

    selectNode() {
        this.dom.classList.add("ProseMirror-selectednode")
        if (!this.innerView) this.open()
    }

    deselectNode() {
        this.dom.classList.remove("ProseMirror-selectednode")
        if (this.innerView) this.close()
    }

    open() {
        // Append a tooltip to the outer node
        let tooltip = this.dom.appendChild(document.createElement("div"))
        tooltip.className = "footnote-tooltip"
        // And put a sub-ProseMirror into that
        this.innerView = new EditorView(tooltip, {
            // You can use any node as an editor document
            state: EditorState.create({
                doc: this.node,
                plugins: [keymap({
                    "Mod-z": () => undo(this.outerView.state, this.outerView.dispatch),
                    "Mod-y": () => redo(this.outerView.state, this.outerView.dispatch)
                })]
            }),
            // This is the magic part
            dispatchTransaction: this.dispatchInner.bind(this),
            handleDOMEvents: {
                mousedown: () => {
                // Kludge to prevent issues due to the fact that the whole
                // footnote is node-selected (and thus DOM-selected) when
                // the parent editor is focused.
                    if (this.outerView.hasFocus() && this.innerView) this.innerView.focus()
                }
            }
        })
    }

    close() {
        this.innerView?.destroy()
        this.innerView = null
        this.dom.textContent = ""
    }

    // если транзакция не пришла из внешнего редактора, меняем его, если нужно
    dispatchInner(tr: Transaction) {
        if (!this.innerView) return;
        let step;
        let {state, transactions} = this.innerView.state.applyTransaction(tr)
        this.innerView.updateState(state)

        if (!tr.getMeta("fromOutside")) {
            let pos = this.getPos()
            let outerTr = this.outerView.state.tr, offsetMap = StepMap.offset(pos ? pos + 1 : 1)
            for (let i = 0; i < transactions.length; i++) {
                let steps = transactions[i].steps
                for (let j = 0; j < steps.length; j++) {
                    step = steps[j].map(offsetMap)
                    if (step) outerTr.step(step)
                }
            }
            if (outerTr.docChanged) this.outerView.dispatch(outerTr)
        }
    }

    // эта функция вызывается при изменении view и работает при активном подредакторе тултипа
    // такое может произойти, например, при коллаборативной работе
    // подобного рода транзакции помечаются fromOutside, чтобы не циклится (потому что подредактор тоже отправляет транзакции для редактора)
    update(node: Node) {
        if (!node.sameMarkup(this.node)) return false
        this.node = node
        if (this.innerView) {
            let state = this.innerView.state
            let start = node.content.findDiffStart(state.doc.content)
            if (start != null) {
                let help = node.content.findDiffEnd(state.doc.content);
                if (help) {
                    let {a: endA, b: endB} = help
                    let overlap = start - Math.min(endA, endB)
                    if (overlap > 0) { endA += overlap; endB += overlap }
                    this.innerView.dispatch(
                    state.tr
                        .replace(start, endB, node.slice(start, endA))
                        .setMeta("fromOutside", true))
                }
            }
        }
        return true
    }

    destroy() {
        if (this.innerView) this.close()
    }

    stopEvent(event: Event) {
        if (this.innerView && this.innerView.dom.contains(event.target as DOMNode)) return true
        return false
    }

    ignoreMutation() { return true }
}
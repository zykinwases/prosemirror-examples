import { useCallback } from "react";
import myServerInterfaces from "./myServerInterfaces";
import {EditorState } from "prosemirror-state"
import {EditorView} from "prosemirror-view"
import {exampleSetup} from "./editorCore/plugins";
import { cyberSchema } from "./editorCore/cyberSchema";
import { Schema } from "prosemirror-model";
import { buildMenuItems } from "./editorCore/menu";
import { FootnoteView } from "./footnote";

export default function Editor() {

  let view: EditorView | undefined;

  let configProm = myServerInterfaces.getConfig()

  const mySchema = new Schema({
    // nodes: addListNodes(cyberSchema.spec.nodes, "paragraph block*", "block"),
    nodes: cyberSchema.spec.nodes,
    marks: cyberSchema.spec.marks
  })

  let plugins = exampleSetup({schema: mySchema, history: false, menuContent: buildMenuItems(mySchema)})

  const editorRef = useCallback(
    (element: HTMLDivElement | null) => {
      if (element) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        view = new EditorView(element, {
          state: EditorState.create({
            schema: mySchema,
            // doc: initDoc,
            plugins,
          }),
          handleTripleClick(view) {
            console.log("triple click")
            myServerInterfaces.saveDocument(view?.state.toJSON())
          },
          nodeViews: {
            footnote(node, view, getPos) { return new FootnoteView(node, view, getPos) }
          },
          transformPastedHTML(html) { console.log(html); return html },
          // dispatchTransaction(tr) { 
          //   myServerInterfaces.sendStat(tr) 
          //   if (view) { 
          //     let newState = view.state.apply(tr)
          //     view?.updateState(newState)
          //   }
          // }
        })
      }
    },
    [view]
  )

  configProm.then((res) => {
    if (res.document) {
      console.log("res")
      console.log(res)
      const state = EditorState.fromJSON({
        schema: mySchema,
        plugins: plugins
      }, res.document)
      view?.updateState(state)
    }
  })

  return <div>
            <div className="editor" ref={editorRef} style={{border: '1px solid'}}></div>
         </div>
}

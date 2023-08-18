import { useCallback } from "react";
import EditorConnection from "./editorConnection";

export default function Editor() {

  const editorRef = useCallback(
    (element: HTMLDivElement | null) => {
      if (element) {
        new EditorConnection(element)
      }
    },
    []
  )

  return <div>
            <div className="editor" ref={editorRef} style={{border: '1px solid'}}></div>
         </div>
}

import crel from "crelt"
import { MenuItem } from "prosemirror-menu"
import { Node } from "prosemirror-model"
import {EditorState, Plugin, PluginKey, Transaction} from "prosemirror-state"
import {Decoration, DecorationSet} from "prosemirror-view"

// комментарий -- id (случайное число) + text
class Comment {
  text: string
  id: number

  constructor(text: string, id: number) {
    this.id = id
    this.text = text
  }
}

// создание декораций
function deco(from: number, to: number, comment: Comment, className: string = "comment") {
  return Decoration.inline(from, to, {class: className}, {comment})
}

// состояние со всеми комментариями
class CommentState {
  version: any
  decos: DecorationSet
  curComment?: Decoration
  unsent: any
  setComment: (comment: string) => void

  constructor(version: any, decos: DecorationSet, setComment: (comment: string) => void, unsent: any, curComment?: Decoration) {
    this.version = version
    this.decos = decos
    this.curComment = curComment
    this.unsent = unsent
    this.setComment = setComment
  }

  findComment(id: number) {
    let current = this.decos.find()
    console.log(current)
    for (let i = 0; i < current.length; i++)
      if (current[i].spec.comment.id === id) return current[i]
  }

  // коментарии на позиции
  commentsAt(pos: number) {
    return this.decos.find(pos, pos)
  }

  // приход новой транзакции
  apply(tr: Transaction) {
    // из метаинформации транзакции от плагина получение типа действия
    let action = tr.getMeta(commentKey), actionType = action && action.type
    let curComment = this.curComment
    let comments = this.commentsAt(tr.selection.from)
    if (comments.length === 0) 
      curComment = undefined;
    else {
      let lastComm = comments[comments.length-1]
      curComment = deco(lastComm.from, lastComm.to, lastComm.spec.comment, "currentComment")
    }
    if (!action && !tr.docChanged) {
      if (curComment?.spec.comment.id !== this.curComment?.spec.comment.id ) {
        this.setComment(curComment?.spec.comment.text)
        return new CommentState(this.version, this.decos, this.setComment, this.unsent, curComment)
      }
      return this
    }
    let base: CommentState = this
    if (actionType === "receive") base = base.receive(action, tr.doc)
    let decos = base.decos
    let unsent = base.unsent
    decos = decos.map(tr.mapping, tr.doc)
    if (actionType === "newComment") {
      console.log("new comment in apply")
      decos = decos.add(tr.doc, [deco(action.from, action.to, action.comment)])
      unsent = unsent.concat(action)
    } else if (actionType === "deleteComment") {
      let deleting = this.findComment(action.comment.id)
      if (deleting)
        decos = decos.remove([deleting])
        unsent = unsent.concat(action)
    }
    return new CommentState(base.version, decos, this.setComment, unsent, curComment)
  }

  receive({version, events, sent}: {version: any, events: any, sent: any}, doc: Node) {
    let set = this.decos
    for (let i = 0; i < events.length; i++) {
      let event = events[i]
      if (event.type === "delete") {
        let found = this.findComment(event.id)
        if (found) set = set.remove([found])
      } else { // "create"
        if (!this.findComment(event.id))
          set = set.add(doc, [deco(event.from, event.to, new Comment(event.text, event.id))])
      }
    }
    return new CommentState(version, set, this.setComment, this.unsent.slice(sent))
  }

  unsentEvents() {
    let result = []
    for (let i = 0; i < this.unsent.length; i++) {
      let action = this.unsent[i]
      if (action.type === "newComment") {
        let found = this.findComment(action.comment.id)
        if (found) result.push({type: "create", id: action.comment.id,
                                from: found.from, to: found.to,
                                text: action.comment.text})
      } else {
        result.push({type: "delete", id: action.comment.id})
      }
    }
    return result
  }

  static init(setComment: (comment: string) => void, config: any) {
    let decos = config.comments ? DecorationSet.create(config.doc, config.comments.comments.map((c: any) => deco(c.from, c.to, new Comment(c.text, c.id)))) : DecorationSet.empty
    return new CommentState(config.comments ? config.comments.version : 0, decos, setComment, [])
  }

}

export const commentKey = new PluginKey("comment")
// setComment -- функция, вызываемая при выборе комментария (может передаваться извне)
export const commentPlugin = function(setComment: (comment: string) => void): Plugin {
  
  return new Plugin({
    key: commentKey,
    state: {
      init: CommentState.init.bind(null, setComment),
      apply(tr, prev) { return prev.apply(tr) },
      toJSON(state: CommentState) {
        return {
            version: state.version,
            decos: state.decos.find().map(dec => {
                console.log(dec.spec.comment)
                return {
                    from: dec.from,
                    to: dec.to,
                    comment: dec.spec.comment
                }
            }),
            unsent: state.unsent
        }
      },
      fromJSON(_config, value, state) {
          console.log(value)
          let set = DecorationSet.create(state.doc, value.decos.map((dec: any) => deco(dec.from, dec.to, dec.comment)))
          return new CommentState(value.version, set, setComment, value.unsent);
      }
    },
    props: {
      decorations(state) { 
        let current = this.getState(state)?.curComment
        if (current) {
          return this.getState(state)?.decos.add(state.doc, [current])
        }
        else
          return this.getState(state)?.decos
        }
    },
  })
}

function randomID() {
  return Math.floor(Math.random() * 0xffffffff)
}

// Command for adding an annotation

export const addAnnotation = function(state: EditorState, dispatch?: (tr: Transaction) => void) {
  let sel = state.selection
  if (sel.empty) return false
  if (dispatch) {
    let text = prompt("Annotation text", "")
    let plugin = commentKey.get(state)
    console.log("new comment")
    if (text && plugin)
      dispatch(state.tr.setMeta(plugin, {type: "newComment", from: sel.from, to: sel.to, comment: new Comment(text, randomID())}))
  }
  return true
}

export const annotationIcon = {
  width: 1024, height: 1024,
  path: "M512 219q-116 0-218 39t-161 107-59 145q0 64 40 122t115 100l49 28-15 54q-13 52-40 98 86-36 157-97l24-21 32 3q39 4 74 4 116 0 218-39t161-107 59-145-59-145-161-107-218-39zM1024 512q0 99-68 183t-186 133-257 48q-40 0-82-4-113 100-262 138-28 8-65 12h-2q-8 0-15-6t-9-15v-0q-1-2-0-6t1-5 2-5l3-5t4-4 4-5q4-4 17-19t19-21 17-22 18-29 15-33 14-43q-89-50-141-125t-51-160q0-99 68-183t186-133 257-48 257 48 186 133 68 183z"
}

export const annotationMenuItem = new MenuItem({
    title: "Add an annotation",
    run: addAnnotation,
    select: (state) => addAnnotation(state),
    icon: annotationIcon
})

// Comment UI

export const commentUI = function(dispatch: (tr: Transaction) => void) {
  return new Plugin({
    props: {
      decorations(state) {
        return commentTooltip(state, dispatch)
      }
    }
  })
}

// если есть комментарии в точке выделения, то показываем их все виджетами
function commentTooltip(state: EditorState, dispatch: (tr: Transaction) => void) {
  let sel = state.selection
  if (!sel.empty) return null
  let comments = commentKey.getState(state)?.commentsAt(sel.from)
  if (!comments?.length) return null
  return DecorationSet.create(state.doc, [Decoration.widget(sel.from, renderComments(comments, dispatch, state), Decoration.inline(comments[0].from, comments[0].to, {class: "currentComment"}, comments[0].spec))])
}

// отображение списка комментариев
function renderComments(comments: Decoration[], dispatch: (tr: Transaction) => void, state: EditorState) {
  return crel("div", {class: "tooltip-wrapper"},
              crel("ul", {class: "commentList"},
                   comments.map(c => renderComment(c.spec.comment, dispatch, state))))
}

// отображение одного комментария в списке
function renderComment(comment: Comment, dispatch: (tr: Transaction) => void, state: EditorState) {
  let btn = crel("button", {class: "commentDelete", title: "Delete annotation"}, "×")
  btn.addEventListener("click", () =>
    {
      let plugin = commentKey.get(state)
      if (plugin)
        dispatch(state.tr.setMeta(plugin, {type: "deleteComment", comment}))
    }
  )
  return crel("li", {class: "commentText"}, comment.text, btn)
}

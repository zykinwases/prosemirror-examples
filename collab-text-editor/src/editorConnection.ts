import { EditorState, Transaction } from "prosemirror-state"
import { EditorView } from "prosemirror-view"
import { cyberSchema } from "./editorCore/cyberSchema";
import { Plugin } from 'prosemirror-state';
import { exampleSetup } from "./editorCore/plugins";
import { buildMenuItems } from "./editorCore/menu";
import { Step } from "prosemirror-transform"
import { collab, getVersion, receiveTransaction, sendableSteps } from "prosemirror-collab";
import myServerInterfaces from "./myServerInterfaces";
import { annotationMenuItem, commentKey, commentPlugin, commentUI } from "./comment";

export default class EditorConnection {
    element: HTMLDivElement
    view: EditorView
    abortController: AbortController
    clientID: number = 0

    constructor(element: HTMLDivElement) {
        this.element = element
        this.dispatch = this.dispatch.bind(this) 
        this.abortController = new AbortController()

        let fullMenu = buildMenuItems(cyberSchema)
        fullMenu.push([annotationMenuItem])

        window.onbeforeunload = ((_e) => {
            myServerInterfaces.close(this.clientID)
        })

        this.view = new EditorView(element, {
            state: EditorState.create({
                schema: cyberSchema,
                plugins: exampleSetup({schema: cyberSchema, history: false, menuContent: fullMenu}).concat([
                    collab({version: 0}),
                    commentPlugin(c => console.log(c)),
                    commentUI(tr => this.dispatch({transaction: tr, external: false}))
            ]),
            }),
            dispatchTransaction: tr => this.dispatch({transaction: tr, external: false}),
            handleTripleClick: (view) => {
                let comment = commentKey.get(view.state)
                let plugins: {[name: string]: Plugin<any>} = {}
                if (comment) {
                    plugins.comment = comment
                }
                myServerInterfaces.saveDocument(view.state.toJSON(plugins))
            },
        })

        myServerInterfaces.getConfig().then((config: {document: any, version: number, clientID: number}) => {
            let comment = commentPlugin(c => console.log(c))
            this.clientID = config.clientID
            const initState = EditorState.fromJSON({
                schema: cyberSchema,
                plugins: exampleSetup({schema: cyberSchema, history: false, menuContent: fullMenu}).concat([
                        collab({version: 0, clientID: config.clientID}),
                        comment,
                        commentUI(tr => this.dispatch({transaction: tr, external: false}))
                ])
            }, config.document, {"comment": comment})
            this.view.updateState(initState)
            this.recv(initState)
        })
    }

    dispatch(action: {transaction: Transaction, external: boolean}) {
        let newState = this.view.state.apply(action.transaction)
        if (!action.external) {
            let sendable = this.sendable(newState)
            if (sendable) {
                myServerInterfaces.sendTransaction(getVersion(newState), commentKey.getState(newState).version, sendable.steps?.steps, sendable.steps?.clientID, sendable.comments)
                    .then((resp: any) => {
                        resp.json().then((data: {version: number, commentVersion: number}) => {
                            let tr = sendable?.steps ? receiveTransaction(this.view.state, sendable.steps.steps, Array(sendable.steps.steps.length).fill(sendable.steps.clientID)) : this.view.state.tr
                            if (sendable?.comments.length)
                                tr.setMeta(commentKey, {type: "receive", version: data.commentVersion, events: [], sent: sendable?.comments.length})
                            this.dispatch({transaction: tr, external: true})
                        })
                    })
                    .catch(err => console.log(err))
            }
        } else {
            this.recv(newState)
        }
        this.view.updateState(newState)
    }

    recv(state: EditorState) {
        console.log(commentKey.getState(state))
        this.abortController.abort()
        this.abortController = new AbortController()
        myServerInterfaces.recieveTransaction(getVersion(state), commentKey.getState(state).version, this.clientID, this.abortController.signal)
            .then((resp: Response) => {
                if (resp.ok && resp.status !== 304)
                    resp.json().then((changes: {steps: {version: number, step: any, clientID: number}[], comments: {version: number, comment: any, clientID: number}[]}) => {
                        let tr = changes.steps.length ? receiveTransaction(state, changes.steps.map(change => Step.fromJSON(cyberSchema, change.step)), changes.steps.map(change => change.clientID)) : state.tr
                        if (changes.comments.length)
                            tr.setMeta(commentKey, {type: "receive", version: changes.comments[changes.comments.length-1].version, events: changes.comments.map(comment => comment.comment), sent: 0})
                        this.dispatch({transaction: tr, external: true})
                    })
            })
            .catch(err => console.warn(err))
    }

    sendable(state: EditorState) {
        let steps = sendableSteps(state)
        let comments = commentKey.getState(state).unsentEvents()
        console.log(comments)
        if (steps || comments.length) 
            return {steps, comments}
    }
}
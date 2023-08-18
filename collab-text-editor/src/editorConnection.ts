import { EditorState, Transaction } from "prosemirror-state"
import { EditorView } from "prosemirror-view"
import { cyberSchema } from "./editorCore/cyberSchema";
import { exampleSetup } from "./editorCore/plugins";
import { buildMenuItems } from "./editorCore/menu";
import { Step } from "prosemirror-transform"
import { collab, getVersion, receiveTransaction, sendableSteps } from "prosemirror-collab";
import myServerInterfaces from "./myServerInterfaces";

export default class EditorConnection {
    element: HTMLDivElement
    view: EditorView
    pooler: any

    constructor(element: HTMLDivElement) {
        this.element = element
        this.dispatch = this.dispatch.bind(this) 
        this.view = new EditorView(element, {
            state: EditorState.create({
                schema: cyberSchema,
                plugins: exampleSetup({schema: cyberSchema, history: false, menuContent: buildMenuItems(cyberSchema)}),
            }),
            dispatchTransaction: tr => this.dispatch({transaction: tr, external: false})
        })

        myServerInterfaces.getConfig().then((config: {document: any, version: number}) => {
            const initState = EditorState.fromJSON({
                schema: cyberSchema,
                plugins: exampleSetup({schema: cyberSchema, history: false, menuContent: buildMenuItems(cyberSchema)}).concat(collab({version: 0}))   
            }, config.document)
            this.view.updateState(initState)
            this.pool(initState)
        })
    }

    dispatch(action: {transaction: Transaction, external: boolean}) {
        console.log(action)
        let newState = this.view.state.apply(action.transaction)
        console.log(newState)
        if (!action.external) {
            let sendable = sendableSteps(newState)
            if (sendable) {
                myServerInterfaces.sendTransaction(sendable.version, sendable.steps, sendable.clientID).then((newVersion: number) => {
                    let tr = sendable ? receiveTransaction(this.view.state, sendable.steps, Array(sendable.steps.length).fill(sendable.clientID)) : this.view.state.tr
                    this.dispatch({transaction: tr, external: true})
                })
            }
        } else {
            if (this.pooler)
                clearInterval(this.pooler)
            this.pool(newState)
        }
        this.view.updateState(newState)
    }

    recv(state: EditorState) {
        myServerInterfaces.recieveTransaction(getVersion(state)).then((resp: Response) => {
            if (resp.ok && resp.status !== 304)
                resp.json().then((changes: {version: number, step: any, clientID: number}[]) => {
                    let tr = receiveTransaction(state, changes.map(change => Step.fromJSON(cyberSchema, change.step)), changes.map(change => change.clientID))
                    this.dispatch({transaction: tr, external: true})
                })
        })
    }

    pool(state: EditorState) {
        this.recv(state)
        this.pooler = setInterval(this.recv.bind(this, state), 1000)
    }
}
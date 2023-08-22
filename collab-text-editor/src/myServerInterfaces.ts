
// add structure
export default class myServerInterfaces {
    static getConfig(): Promise<any> {
        return fetch('/api/get_config', {
            method: 'get'
        })
            .then((res) => {
                return res.json()
            })
    }

    static close(clientID: number): void {
        fetch(`/api/close&${new URLSearchParams({clientID: clientID.toString()})}`, {
            method: "get"
        })
    }

    static saveDocument(document: any): void {
        fetch('/api/save_document', {
            method: 'post',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                document: document
            })
        })
    }

    static sendTransaction(version: number, commentVersion: number, steps: any, clientID: string | number = 0, comments: any): Promise<any> {
        return fetch('/api/events', {
            method: 'post',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                version: version,
                commentVersion: commentVersion,
                steps: steps,
                comments: comments,
                clientID: clientID
            })
        })
    }

    static recieveTransaction(version: number, commentVersion: number, clientID: number, signal: AbortSignal): Promise<Response> {
        return fetch(`/api/events?${new URLSearchParams({cur_version: version.toString(), comment_version: commentVersion.toString(), clientID: clientID.toString()})}`, {
            method: 'get',
            signal: signal
        })
    }

}
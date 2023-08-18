
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

    static sendTransaction(version: number, steps: any, clientID: string | number = 0): Promise<any> {
        return fetch('/api/events', {
            method: 'post',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                version: version,
                steps: steps,
                clientID: clientID
            })
        })
    }

    static recieveTransaction(version: number): Promise<Response> {
        return fetch(`/api/events?${new URLSearchParams({cur_version: version.toString()})}`, {
            method: 'get'
        })
    }
}

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

}
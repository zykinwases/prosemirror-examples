from time import sleep
import uvicorn
from fastapi import FastAPI, HTTPException
import os
import json
from pydantic import BaseModel

app = FastAPI()

version = 0

class Document(BaseModel):
    document: dict

@app.get("/")
async def root():
    return {"message": "This is a server for prosemirror examples"}

@app.get("/api/get_config")
async def get_config():
    global version
    if os.path.isfile(f"{os.path.dirname(__file__)}/import.json"):
        with open(f"{os.path.dirname(__file__)}/import.json") as f:
            doc = json.load(f)
    else:
        doc = None
    return {
        "document": doc,
        "version": version
    }

@app.post("/api/save_document")
async def save_document(document: Document):
    print(document)
    with open(f"{os.path.dirname(__file__)}/import.json", "w") as file:
        json.dump(document.document, file)
    return

class HistoryEvent(BaseModel):
    version: int
    step: dict
    clientID: int

history: list[HistoryEvent] = []

class EditorEvents(BaseModel):
    version: int
    steps: list[dict]
    clientID: int


@app.post("/api/events")
async def post_events(events: EditorEvents):
    global history
    global version
    if len(history) > 0 and version > events.version:
        raise HTTPException(status_code=400, detail="Newer version available")
    version += 1
    for step in events.steps:
        history.append(HistoryEvent(version=version, step=step, clientID=events.clientID))
    print(version)
    print(history)
    return {
        "version": version
    }

@app.get("/api/events", responses={304: {"description": "Document was not modified since last request"}})
async def get_events(cur_version: int) -> list[HistoryEvent]:
    global history
    global version
    if (cur_version == version):
        raise HTTPException(status_code=304, detail="New version is not available")
    new_steps: list[HistoryEvent] = []
    for event in history:
        if (event.version > cur_version):
            new_steps.append(event)
    return new_steps

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
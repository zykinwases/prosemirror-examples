from time import sleep
import uvicorn
from fastapi import FastAPI, HTTPException, Request
import os
import json
from pydantic import BaseModel
import asyncio
import random

app = FastAPI()

version = 0
commentVersion = 0
activeClients: list[int] = []

class Document(BaseModel):
    document: dict

@app.get("/")
async def root():
    return {"message": "This is a server for prosemirror examples"}

@app.get("/api/get_config")
async def get_config():
    global version
    global activeClients
    if os.path.isfile(f"{os.path.dirname(__file__)}/import.json"):
        with open(f"{os.path.dirname(__file__)}/import.json") as f:
            doc = json.load(f)
    else:
        doc = None
    while (clientID := random.randint(0, 100000)) in activeClients:
        pass
    activeClients.append(clientID)
    return {
        "document": doc,
        "version": version,
        "clientID": clientID
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
class CommentHistoryEvent(BaseModel):
    version: int
    comment: dict
    clientID: int

history: list[HistoryEvent] = []
commentHistory: list[CommentHistoryEvent] = []

class EditorEvents(BaseModel):
    version: int
    commentVersion: int
    steps: list[dict] | None = None
    comments: list[dict] | None = None
    clientID: int
class ResponseEvents(BaseModel):
    steps: list[HistoryEvent]
    comments: list[CommentHistoryEvent]

@app.post("/api/events")
async def post_events(request: Request, events: EditorEvents):
    global history
    global commentHistory
    global version
    global commentVersion
    if len(history) > 0 and (version > events.version or commentVersion > events.commentVersion):
        raise HTTPException(status_code=400, detail="Newer version available")
    if events.steps:
        version += len(events.steps)
        for step in events.steps:
            history.append(HistoryEvent(version=version, step=step, clientID=events.clientID))
    if events.comments:
        commentVersion += 1
        for comment in events.comments:
            commentHistory.append(CommentHistoryEvent(version=commentVersion, comment=comment, clientID=events.clientID))
    return {
        "version": version,
        "commentVersion": commentVersion
    }

@app.get("/api/events", responses={304: {"description": "Document was not modified since last request"}})
async def get_events(request: Request, cur_version: int, comment_version: int, clientID: int) -> ResponseEvents:
    global history
    global commentHistory
    global version
    global commentVersion
    global activeClients
    while (cur_version == version and comment_version == commentVersion):
        disconnected = await request.is_disconnected()
        if disconnected or (clientID not in activeClients):
            raise HTTPException(status_code=499, detail="Client closed request")
        await asyncio.sleep(0.5)
    if (cur_version > version or comment_version > commentVersion):
        raise HTTPException(status_code=400, detail="Wrong version")
    new_steps: list[HistoryEvent] = []
    new_comments: list[CommentHistoryEvent] = []
    for event in history:
        if (event.version > cur_version):
            new_steps.append(event)
    for event in commentHistory:
        if (event.version > comment_version):
            new_comments.append(event)
    return ResponseEvents(steps=new_steps, comments=new_comments)

@app.get("/api/close")
async def close(clientID: int):
    global activeClients
    activeClients.remove(clientID)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
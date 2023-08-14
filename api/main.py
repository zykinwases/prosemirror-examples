import uvicorn
from fastapi import FastAPI
import os
import json

app = FastAPI()

@app.get("/")
async def root():
    return {"message": "This is a server for prosemirror examples"}

@app.get("/api/get_config")
async def get_config():
    if os.path.isfile(f"{os.path.dirname(__file__)}/import.json"):
        with open(f"{os.path.dirname(__file__)}/import.json") as f:
            doc = json.load(f)
            print(doc)
    else:
        doc = None
    return {"document": doc}

@app.post("/api/save_document")
async def save_document(document):
    with open(f"{os.path.dirname(__file__)}/import.json", "w") as file:
        json.dump(document, file)
    return

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
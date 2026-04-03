from fastapi import FastAPI

app = FastAPI(title="Gitread API")


@app.get("/")
async def root() -> dict[str, str]:
    return {"status": "ok"}

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Backend FastAPI fonctionne ! 🚀"}

@app.get("/test")
def test():
    print("✅ Le frontend a appelé le backend !")
    return {
        "status": "success",
        "message": "Connexion OK entre frontend et backend ! ✅"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
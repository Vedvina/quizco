import sys
import os

# pyright: reportMissingImports=false

sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI  # type: ignore[import-not-found]
from fastapi.middleware.cors import CORSMiddleware  # type: ignore[import-not-found]
from dotenv import load_dotenv  # type: ignore[import-not-found]

from routes.auth import router as auth_router
from routes.questions import router as questions_router
from routes.quizzes import router as quizzes_router
from routes.answers import router as answers_router
from routes.results import router as results_router
from routes.activity import router as activity_router

load_dotenv()

app = FastAPI(title="QuizCo API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(questions_router)
app.include_router(quizzes_router)
app.include_router(answers_router)
app.include_router(results_router)
app.include_router(activity_router)


@app.get("/")
def root():
    return {"message": "QuizCo API is running"}


@app.get("/health")
def health():
    return {"status": "ok"}

import random
import string
from fastapi import APIRouter, Depends
from models.schemas import QuizCreate
from services.supabase_client import get_supabase
from deps import require_auth

router = APIRouter(prefix="/quizzes", tags=["quizzes"])


def generate_quiz_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))


@router.post("/")
def create_quiz(quiz: QuizCreate, user=Depends(require_auth)):
    quiz_code = generate_quiz_code() if quiz.quiz_type == "LIVE" else None

    quiz_data = {
        "title": quiz.title,
        "description": quiz.description,
        "quiz_type": quiz.quiz_type,
        "duration_minutes": quiz.duration_minutes,
        "max_attempts": quiz.max_attempts,
        "quiz_code": quiz_code,
        "start_time": quiz.start_time.isoformat() if quiz.start_time else None,
        "end_time": quiz.end_time.isoformat() if quiz.end_time else None,
        "created_by": user.id,
    }

    result = get_supabase().table("quizzes").insert(quiz_data).execute()
    created_quiz = result.data[0]

    if quiz.question_ids:
        for i, qid in enumerate(quiz.question_ids):
            get_supabase().table("quiz_questions").insert({
                "quiz_id": created_quiz["id"],
                "question_id": qid,
                "order_index": i,
            }).execute()

    return created_quiz


@router.get("/{quiz_id}")
def get_quiz(quiz_id: str, user=Depends(require_auth)):
    result = get_supabase().table("quizzes").select("*").eq("id", quiz_id).execute()
    if not result.data:
        return {"error": "Quiz not found"}

    questions = get_supabase().table("quiz_questions") \
        .select("*, questions(*)") \
        .eq("quiz_id", quiz_id) \
        .order("order_index") \
        .execute()

    quiz = result.data[0]
    quiz["questions"] = questions.data
    return quiz


@router.put("/{quiz_id}")
def update_quiz(quiz_id: str, quiz: QuizCreate, user=Depends(require_auth)):
    result = get_supabase().table("quizzes").update(quiz.dict(exclude={"question_ids"})).eq("id", quiz_id).execute()
    return result.data


@router.delete("/{quiz_id}")
def delete_quiz(quiz_id: str, user=Depends(require_auth)):
    get_supabase().table("quizzes").delete().eq("id", quiz_id).execute()
    return {"deleted": True}

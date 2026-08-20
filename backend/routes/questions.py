from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from models.schemas import QuestionCreate, AIQuestionRequest
from services.supabase_client import get_supabase
from services.ai_generator import generate_questions_with_ai
from deps import require_auth

router = APIRouter(prefix="/questions", tags=["questions"])


@router.post("/generate")
async def generate_questions(request: AIQuestionRequest, user=Depends(require_auth)):
    try:
        questions = await generate_questions_with_ai(
            request.subject, request.topic, request.difficulty,
            request.question_type, request.num_questions, request.marks_per_question
        )
        return {"questions": questions}
    except Exception as e:
        return JSONResponse(status_code=500, content={"detail": str(e)})


@router.get("/")
def get_questions(subject: str = None, topic: str = None, difficulty: str = None, user=Depends(require_auth)):
    query = get_supabase().table("questions").select("*")
    if subject:
        query = query.eq("subject", subject)
    if topic:
        query = query.eq("topic", topic)
    if difficulty:
        query = query.eq("difficulty", difficulty)
    result = query.execute()
    return result.data


@router.post("/")
def create_question(question: QuestionCreate, user=Depends(require_auth)):
    result = get_supabase().table("questions").insert(question.model_dump()).execute()
    return result.data


@router.put("/{question_id}")
def update_question(question_id: str, question: QuestionCreate, user=Depends(require_auth)):
    result = get_supabase().table("questions").update(question.model_dump()).eq("id", question_id).execute()
    return result.data


@router.delete("/{question_id}")
def delete_question(question_id: str, user=Depends(require_auth)):
    result = get_supabase().table("questions").delete().eq("id", question_id).execute()
    return {"deleted": True}

from fastapi import APIRouter
from services.supabase_client import get_supabase

router = APIRouter(tags=["results"])


@router.get("/results/{quiz_id}")
def get_quiz_results(quiz_id: str):
    result = get_supabase().table("results") \
        .select("*, profiles(full_name, roll_number)") \
        .eq("quiz_id", quiz_id) \
        .order("obtained_marks", desc=True) \
        .execute()
    return result.data


@router.get("/results/student/{student_id}")
def get_student_results(student_id: str):
    result = get_supabase().table("results") \
        .select("*, quizzes(title, quiz_type)") \
        .eq("student_id", student_id) \
        .order("evaluated_at", desc=True) \
        .execute()
    return result.data

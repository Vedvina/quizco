from fastapi import APIRouter
from models.schemas import AnswerSubmit, QuizSubmit
from services.supabase_client import get_supabase
from datetime import datetime

router = APIRouter(tags=["answers"])


@router.post("/answers")
def submit_answer(answer: AnswerSubmit):
    question = get_supabase().table("questions").select("*").eq("id", answer.question_id).execute()
    if not question.data:
        return {"error": "Question not found"}

    q = question.data[0]
    is_correct = answer.selected_answer.strip().lower() == q["correct_answer"].strip().lower()
    marks = q["marks"] if is_correct else 0

    answer_data = {
        "quiz_id": answer.quiz_id,
        "question_id": answer.question_id,
        "selected_answer": answer.selected_answer,
        "is_correct": is_correct,
        "marks_obtained": marks,
    }

    result = get_supabase().table("answers").upsert(answer_data).execute()
    return {"answer": result.data, "is_correct": is_correct, "marks": marks}


@router.post("/quizzes/{quiz_id}/submit")
def submit_quiz(quiz_id: str, submission: QuizSubmit):
    answers = get_supabase().table("answers") \
        .select("*") \
        .eq("quiz_id", quiz_id) \
        .eq("student_id", submission.student_id) \
        .execute()

    total_marks = sum(a["marks_obtained"] for a in answers.data)
    correct = sum(1 for a in answers.data if a["is_correct"])
    incorrect = sum(1 for a in answers.data if not a["is_correct"])
    total_questions = len(answers.data)

    quiz = get_supabase().table("quizzes").select("total_marks").eq("id", quiz_id).execute()
    max_marks = quiz.data[0]["total_marks"] if quiz.data else total_marks
    percentage = (total_marks / max_marks * 100) if max_marks > 0 else 0

    result_data = {
        "quiz_id": quiz_id,
        "student_id": submission.student_id,
        "total_marks": max_marks,
        "obtained_marks": total_marks,
        "percentage": round(percentage, 2),
        "total_questions": total_questions,
        "correct_answers": correct,
        "incorrect_answers": incorrect,
    }

    result = get_supabase().table("results").upsert(result_data).execute()

    get_supabase().table("quiz_participants").update({
        "score": total_marks,
        "completed": True,
        "completed_at": datetime.utcnow().isoformat(),
    }).eq("quiz_id", quiz_id).eq("student_id", submission.student_id).execute()

    return {
        "total_marks": max_marks,
        "obtained_marks": total_marks,
        "percentage": round(percentage, 2),
        "correct": correct,
        "incorrect": incorrect,
    }

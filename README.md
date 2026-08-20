# QuizCo

AI-Powered Interactive Online Testing & Secure Assessment Platform

## Tech Stack

- **Frontend:** React.js, Vite, Tailwind CSS
- **Backend:** Python, FastAPI
- **Database:** Supabase (PostgreSQL, Auth, Realtime, Storage)
- **AI:** Google Gemini / OpenAI API

## Project Structure

```
QuizCo/
├── frontend/        # React + Vite + Tailwind
├── backend/         # FastAPI Python backend
├── database/        # Supabase SQL schemas
└── README.md
```

## Getting Started

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```


## Environment Variables

See `.env.example` files in `frontend/` and `backend/`.

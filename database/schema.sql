-- QuizCo Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (extends Supabase auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('FACULTY', 'STUDENT')),
  roll_number text,
  department text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Questions table
create table questions (
  id uuid primary key default uuid_generate_v4(),
  subject text not null,
  topic text not null,
  question_text text not null,
  question_type text not null default 'MCQ' check (question_type in ('MCQ', 'TRUE_FALSE', 'SHORT_ANSWER')),
  options jsonb,
  correct_answer text not null,
  difficulty text not null default 'Medium' check (difficulty in ('Easy', 'Medium', 'Hard')),
  marks int not null default 1,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- Quizzes table
create table quizzes (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  quiz_type text not null check (quiz_type in ('LIVE', 'SCHEDULED')),
  status text not null default 'DRAFT' check (status in ('DRAFT', 'WAITING', 'ACTIVE', 'COMPLETED', 'CANCELLED')),
  quiz_code text unique,
  start_time timestamptz,
  end_time timestamptz,
  duration_minutes int not null default 60,
  total_marks int not null default 0,
  max_attempts int not null default 1,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Quiz <-> Question junction table
create table quiz_questions (
  id uuid primary key default uuid_generate_v4(),
  quiz_id uuid references quizzes(id) on delete cascade,
  question_id uuid references questions(id) on delete cascade,
  order_index int not null default 0,
  unique(quiz_id, question_id)
);

-- Quiz participants
create table quiz_participants (
  id uuid primary key default uuid_generate_v4(),
  quiz_id uuid references quizzes(id) on delete cascade,
  student_id uuid references profiles(id) on delete cascade,
  joined_at timestamptz default now(),
  score int default 0,
  completed boolean default false,
  completed_at timestamptz,
  unique(quiz_id, student_id)
);

-- Answers table
create table answers (
  id uuid primary key default uuid_generate_v4(),
  quiz_id uuid references quizzes(id) on delete cascade,
  question_id uuid references questions(id) on delete cascade,
  student_id uuid references profiles(id) on delete cascade,
  selected_answer text,
  is_correct boolean,
  marks_obtained int default 0,
  submitted_at timestamptz default now(),
  unique(quiz_id, question_id, student_id)
);

-- Results table
create table results (
  id uuid primary key default uuid_generate_v4(),
  quiz_id uuid references quizzes(id) on delete cascade,
  student_id uuid references profiles(id) on delete cascade,
  total_marks int not null default 0,
  obtained_marks int not null default 0,
  percentage decimal(5,2) default 0,
  total_questions int default 0,
  correct_answers int default 0,
  incorrect_answers int default 0,
  time_taken_seconds int default 0,
  evaluated_at timestamptz default now(),
  unique(quiz_id, student_id)
);

-- Activity logs (security monitoring)
create table activity_logs (
  id uuid primary key default uuid_generate_v4(),
  quiz_id uuid references quizzes(id) on delete cascade,
  student_id uuid references profiles(id) on delete cascade,
  event_type text not null,
  event_details text,
  violation_count int default 1,
  flagged boolean default false,
  created_at timestamptz default now()
);

-- Row Level Security
alter table profiles enable row level security;
alter table questions enable row level security;
alter table quizzes enable row level security;
alter table quiz_questions enable row level security;
alter table quiz_participants enable row level security;
alter table answers enable row level security;
alter table results enable row level security;
alter table activity_logs enable row level security;

-- Profiles: users can read all, update own
create policy "Profiles: public read" on profiles for select using (true);
create policy "Profiles: update own" on profiles for update using (auth.uid() = id);

-- Questions: authenticated users can read, faculty can manage
create policy "Questions: authenticated read" on questions for select to authenticated using (true);
create policy "Questions: faculty insert" on questions for insert to authenticated with check (
  exists (select 1 from profiles where id = auth.uid() and role = 'FACULTY')
);
create policy "Questions: faculty update" on questions for update to authenticated using (
  exists (select 1 from profiles where id = auth.uid() and role = 'FACULTY')
);
create policy "Questions: faculty delete" on questions for delete to authenticated using (
  exists (select 1 from profiles where id = auth.uid() and role = 'FACULTY')
);

-- Quizzes: authenticated read, faculty manage
create policy "Quizzes: authenticated read" on quizzes for select to authenticated using (true);
create policy "Quizzes: faculty insert" on quizzes for insert to authenticated with check (
  exists (select 1 from profiles where id = auth.uid() and role = 'FACULTY')
);
create policy "Quizzes: faculty update" on quizzes for update to authenticated using (
  exists (select 1 from profiles where id = auth.uid() and role = 'FACULTY')
);

-- Quiz questions: authenticated read, faculty manage
create policy "Quiz questions: authenticated read" on quiz_questions for select to authenticated using (true);
create policy "Quiz questions: faculty insert" on quiz_questions for insert to authenticated with check (
  exists (select 1 from profiles where id = auth.uid() and role = 'FACULTY')
);

-- Quiz participants: students can join, faculty can view
create policy "Quiz participants: authenticated read" on quiz_participants for select to authenticated using (true);
create policy "Quiz participants: student insert" on quiz_participants for insert to authenticated with check (
  exists (select 1 from profiles where id = auth.uid() and role = 'STUDENT')
);

-- Answers: students insert own, faculty read quiz answers
create policy "Answers: student insert" on answers for insert to authenticated with check (
  exists (select 1 from profiles where id = auth.uid() and role = 'STUDENT')
);
create policy "Answers: read own or faculty" on answers for select to authenticated using (
  student_id = auth.uid() or
  exists (select 1 from profiles where id = auth.uid() and role = 'FACULTY')
);

-- Results: students read own, faculty read all
create policy "Results: read own or faculty" on results for select to authenticated using (
  student_id = auth.uid() or
  exists (select 1 from profiles where id = auth.uid() and role = 'FACULTY')
);

-- Activity logs: faculty read, students read own
create policy "Activity logs: faculty read" on activity_logs for select to authenticated using (
  exists (select 1 from profiles where id = auth.uid() and role = 'FACULTY')
);
create policy "Activity logs: student insert" on activity_logs for insert to authenticated with check (
  exists (select 1 from profiles where id = auth.uid() and role = 'STUDENT')
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'role');
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

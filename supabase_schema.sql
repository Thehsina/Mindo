-- Supabase Database Schema DDL for Task Manager
-- Copy and run this script in your Supabase project SQL Editor.

-- Enable Row Level Security (RLS) on all tables.

-----------------------------------------------------------
-- 1. Profiles Table
-----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT DEFAULT '',
  mobile TEXT DEFAULT '',
  dob TEXT DEFAULT '',
  gender TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  job_title TEXT DEFAULT '',
  organization TEXT DEFAULT '',
  location TEXT DEFAULT '',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Automatically create a profile when a new auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id, 
    new.email, 
    coalesce(new.raw_user_meta_data->>'display_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to execute the function on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-----------------------------------------------------------
-- 2. Tasks Table
-----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE DEFAULT auth.uid() NOT NULL,
  title TEXT NOT NULL,
  note TEXT DEFAULT '',
  due_date TEXT DEFAULT '',
  priority TEXT DEFAULT 'None',
  category TEXT DEFAULT 'Reminders',
  repeat TEXT DEFAULT 'Never',
  organization TEXT DEFAULT '',
  places_people TEXT DEFAULT '',
  location_type TEXT DEFAULT 'none',
  location_reminder BOOLEAN DEFAULT false,
  location_name TEXT DEFAULT '',
  completed BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'todo',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "Users can select their own tasks" ON public.tasks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks" ON public.tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks" ON public.tasks
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks" ON public.tasks
  FOR DELETE USING (auth.uid() = user_id);

-----------------------------------------------------------
-- 3. Task Subtasks Table
-----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.task_subtasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE DEFAULT auth.uid() NOT NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.task_subtasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own task subtasks" ON public.task_subtasks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own task subtasks" ON public.task_subtasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own task subtasks" ON public.task_subtasks
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own task subtasks" ON public.task_subtasks
  FOR DELETE USING (auth.uid() = user_id);

-----------------------------------------------------------
-- 4. Notes Table
-----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE DEFAULT auth.uid() NOT NULL,
  heading TEXT DEFAULT '',
  description TEXT DEFAULT '',
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "Users can manage their own notes" ON public.notes
  FOR ALL USING (auth.uid() = user_id);

-----------------------------------------------------------
-- 4. Grocery Table
-----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.grocery (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE DEFAULT auth.uid() NOT NULL,
  name TEXT NOT NULL,
  quantity TEXT DEFAULT '',
  category TEXT DEFAULT 'Other',
  bucket_label TEXT DEFAULT '',
  list_type TEXT DEFAULT 'weekly',
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.grocery
  ADD COLUMN IF NOT EXISTS quantity TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Other';

-- Enable RLS
ALTER TABLE public.grocery ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "Users can manage their own grocery list" ON public.grocery
  FOR ALL USING (auth.uid() = user_id);

-----------------------------------------------------------
-- 5. Habits Table
-----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.habits (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE DEFAULT auth.uid() NOT NULL,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '⭐',
  frequency TEXT DEFAULT 'daily',
  custom_days JSONB DEFAULT '[]'::jsonb,
  target TEXT DEFAULT '',
  reminder_time TEXT DEFAULT '',
  paused BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "Users can manage their own habits" ON public.habits
  FOR ALL USING (auth.uid() = user_id);

-----------------------------------------------------------
-- 6. Habit Completions Table
-----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.habit_completions (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE DEFAULT auth.uid() NOT NULL,
  habit_id TEXT REFERENCES public.habits(id) ON DELETE CASCADE NOT NULL,
  date TEXT NOT NULL,
  completed BOOLEAN DEFAULT true,
  progress_value NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.habit_completions ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "Users can manage their own habit completions" ON public.habit_completions
  FOR ALL USING (auth.uid() = user_id);

-----------------------------------------------------------
-- 7. Meals Table (Meal Prep)
-----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.meals (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE DEFAULT auth.uid() NOT NULL,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'dinner',
  day TEXT DEFAULT 'monday',
  date_str TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  ingredients JSONB DEFAULT '[]'::jsonb,
  favorite BOOLEAN DEFAULT false,
  tags JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "Users can manage their own meals" ON public.meals
  FOR ALL USING (auth.uid() = user_id);


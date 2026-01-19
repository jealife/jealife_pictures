-- Création de la table profiles si elle n'existe pas
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  updated_at timestamp with time zone,
  username text unique,
  full_name text,
  avatar_url text,
  website text,
  
  constraint username_length check (char_length(username) >= 3)
);

-- Active la sécurité niveau ligne (RLS)
alter table public.profiles enable row level security;

-- Politique pour permettre à tout le monde de voir les profils (Lecture publique)
create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

-- Politique pour permettre aux utilisateurs d'insérer leur propre profil (Création)
create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

-- Politique pour permettre aux utilisateurs de mettre à jour leur propre profil (Mise à jour)
create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- (Optionnel) Trigger pour créer automatiquement un profil à l'inscription
-- Si vous utilisez ce trigger, la partie "INSERT" dans le code JS deviendra un "UPDATE".
-- create or replace function public.handle_new_user() 
-- returns trigger as $$
-- begin
--   insert into public.profiles (id, full_name, avatar_url)
--   values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
--   return new;
-- end;
-- $$ language plpgsql security definer;
--
-- create trigger on_auth_user_created
--   after insert on auth.users
--   for each row execute procedure public.handle_new_user();

-- --- MEDIA TABLE ---
create table if not exists public.media (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  url text not null,
  type text default 'photo', -- 'photo', 'illustration', 'video'
  title text,
  alt_text text,
  description text,
  width integer,
  height integer,
  size integer, -- file size in bytes
  mime_type text,
  location text,
  status text default 'published', -- 'published', 'pending', 'rejected'
  views_count integer default 0,
  downloads_count integer default 0,
  likes_count integer default 0
);

-- RLS for Media
alter table public.media enable row level security;

create policy "Media are viewable by everyone."
  on media for select
  using ( status = 'published' );

create policy "Users can upload their own media."
  on media for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own media."
  on media for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own media."
  on media for delete
  using ( auth.uid() = user_id );

-- --- MEDIA LIKES TABLE ---
create table if not exists public.media_likes (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  media_id uuid references public.media(id) on delete cascade not null,
  unique(user_id, media_id)
);

alter table public.media_likes enable row level security;

create policy "Likes are viewable by everyone."
  on media_likes for select
  using ( true );

create policy "Users can insert their own likes."
  on media_likes for insert
  with check ( auth.uid() = user_id );

create policy "Users can delete their own likes."
  on media_likes for delete
  using ( auth.uid() = user_id );


-- STORAGE POLICIES (Note: You must create the 'media' bucket in Supabase Dashboard manually first!)
-- For SQL to work for storage, sometimes you need to enable the extension or insert into storage.buckets.
-- Here we assume the bucket 'media' exists.

-- Allow public access to media bucket
-- create policy "Public Access"
-- on storage.objects for select
-- using ( bucket_id = 'media' );

-- Allow authenticated users to upload to media bucket
-- create policy "Authenticated users can upload"
-- on storage.objects for insert
-- with check ( bucket_id = 'media' and auth.role() = 'authenticated' );

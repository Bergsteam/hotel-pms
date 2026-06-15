-- ============================================================
-- Hotel PMS — Supabase Schema
-- Запустить в SQL Editor вашего Supabase проекта
-- ============================================================

-- Расширения
create extension if not exists "uuid-ossp";

-- ============================================================
-- HOTELS (мультитенантность)
-- ============================================================
create table public.hotels (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  address     text,
  city        text default 'Каракол',
  phone       text,
  plan        text not null default 'starter' check (plan in ('starter','pro','business')),
  plan_expires timestamptz,
  max_rooms   int not null default 10,
  tax_mode    text not null default 'ors' check (tax_mode in ('ors','nds','patent')),
  currency    text not null default 'KGS',
  season_start int check (season_start between 1 and 12),
  season_end   int check (season_end between 1 and 12),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- PROFILES (привязка auth.users → роль в отеле)
-- ============================================================
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  hotel_id   uuid references public.hotels(id) on delete cascade,
  full_name  text,
  role       text not null default 'reception'
               check (role in ('owner','manager','reception','housekeeper','chef')),
  phone      text,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- FLOORS
-- ============================================================
create table public.floors (
  id         uuid primary key default uuid_generate_v4(),
  hotel_id   uuid not null references public.hotels(id) on delete cascade,
  number     int not null,
  name       text,
  created_at timestamptz not null default now(),
  unique(hotel_id, number)
);

-- ============================================================
-- ROOMS
-- ============================================================
create table public.rooms (
  id           uuid primary key default uuid_generate_v4(),
  hotel_id     uuid not null references public.hotels(id) on delete cascade,
  floor_id     uuid not null references public.floors(id) on delete cascade,
  number       text not null,
  type         text not null default 'standard'
                 check (type in ('standard','deluxe','suite','family','economy')),
  capacity     int not null default 2,
  price_per_night numeric(10,2) not null default 0,
  status       text not null default 'free'
                 check (status in ('free','occupied','cleaning','checkout','blocked')),
  description  text,
  amenities    text[],
  created_at   timestamptz not null default now(),
  unique(hotel_id, number)
);

-- ============================================================
-- GUESTS
-- ============================================================
create table public.guests (
  id           uuid primary key default uuid_generate_v4(),
  hotel_id     uuid not null references public.hotels(id) on delete cascade,
  full_name    text not null,
  phone        text,
  email        text,
  passport     text,
  nationality  text default 'KG',
  notes        text,
  loyalty_pts  int not null default 0,
  created_at   timestamptz not null default now()
);

-- ============================================================
-- RESERVATIONS
-- ============================================================
create table public.reservations (
  id            uuid primary key default uuid_generate_v4(),
  hotel_id      uuid not null references public.hotels(id) on delete cascade,
  room_id       uuid not null references public.rooms(id),
  guest_id      uuid references public.guests(id),
  guest_name    text not null,
  guest_phone   text,
  check_in      date not null,
  check_out     date not null,
  adults        int not null default 1,
  children      int not null default 0,
  status        text not null default 'confirmed'
                  check (status in ('confirmed','checked_in','checked_out','cancelled','no_show')),
  source        text not null default 'direct'
                  check (source in ('direct','booking','airbnb','other')),
  total_amount  numeric(10,2),
  paid_amount   numeric(10,2) not null default 0,
  notes         text,
  created_by    uuid references public.profiles(id),
  created_at    timestamptz not null default now(),
  check (check_out > check_in)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.hotels      enable row level security;
alter table public.profiles    enable row level security;
alter table public.floors      enable row level security;
alter table public.rooms       enable row level security;
alter table public.guests      enable row level security;
alter table public.reservations enable row level security;

-- Хелпер: получить hotel_id текущего пользователя
create or replace function public.my_hotel_id()
returns uuid language sql stable security definer as $$
  select hotel_id from public.profiles where id = auth.uid()
$$;

-- Хелпер: получить роль текущего пользователя
create or replace function public.my_role()
returns text language sql stable security definer as $$
  select role from public.profiles where id = auth.uid()
$$;

-- HOTELS: только своя гостиница
create policy "hotel_select" on public.hotels for select
  using (id = my_hotel_id());
create policy "hotel_update" on public.hotels for update
  using (id = my_hotel_id() and my_role() in ('owner','manager'));

-- PROFILES: своя гостиница
create policy "profiles_select" on public.profiles for select
  using (hotel_id = my_hotel_id());
create policy "profiles_insert" on public.profiles for insert
  with check (hotel_id = my_hotel_id() and my_role() in ('owner','manager'));
create policy "profiles_update" on public.profiles for update
  using (hotel_id = my_hotel_id() and my_role() in ('owner','manager'));

-- FLOORS, ROOMS, GUESTS, RESERVATIONS — шаблон: только своя гостиница
create policy "floors_all" on public.floors for all
  using (hotel_id = my_hotel_id());
create policy "rooms_all" on public.rooms for all
  using (hotel_id = my_hotel_id());
create policy "guests_all" on public.guests for all
  using (hotel_id = my_hotel_id());
create policy "reservations_all" on public.reservations for all
  using (hotel_id = my_hotel_id());

-- ============================================================
-- ФУНКЦИЯ: автосоздание профиля при регистрации
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'owner')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- ТЕСТОВЫЕ ДАННЫЕ (опционально, для разработки)
-- ============================================================
-- insert into public.hotels (name, city, plan) values ('Отель Каракол', 'Каракол', 'pro');

-- Profiles table
create table if not exists public.profiles (
  user_id uuid primary key,
  email text,
  display_name text
);

-- Orders policy
create policy "orders_select"
  on public.orders for select
  to authenticated
  using ( true );

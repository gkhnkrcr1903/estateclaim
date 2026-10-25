-- Ev/Arsa Analiz — müşteri ve portföy kayıtları, ekspertiz firması bilgisi.
-- Supabase panelinde SQL Editor > New query'ye yapıştırıp bir kez çalıştırın. Tekrar çalıştırmak güvenlidir.
-- Her danışman yalnızca KENDİ müşterilerini ve portföyünü görür, ekler, değiştirir, siler.

create table if not exists public.musteriler (
  id uuid primary key default gen_random_uuid(),
  sahip uuid not null default auth.uid() references auth.users (id) on delete cascade,
  ad text not null check (length(ad) between 1 and 120),
  telefon text,
  eposta text,
  tur text not null default 'Alıcı' check (tur in ('Alıcı', 'Satıcı', 'Kiracı', 'Ev sahibi', 'Yatırımcı')),
  butce_min numeric,
  butce_max numeric,
  notlar text check (notlar is null or length(notlar) <= 4000),
  olusturma timestamptz not null default now(),
  guncelleme timestamptz not null default now()
);
create index if not exists musteriler_sahip on public.musteriler (sahip, guncelleme desc);

create table if not exists public.portfoy (
  id uuid primary key default gen_random_uuid(),
  sahip uuid not null default auth.uid() references auth.users (id) on delete cascade,
  musteri_id uuid references public.musteriler (id) on delete set null,
  tur text not null check (tur in ('ev', 'arsa')),
  baslik text not null check (length(baslik) between 1 and 160),
  il text not null,
  ilce text,
  mahalle text,
  durum text not null default 'Aktif' check (durum in ('Aktif', 'Opsiyonlu', 'Satıldı', 'Kiralandı', 'İptal')),
  fiyat numeric,
  veri jsonb not null, -- ev: Ev Analiz formu; arsa: arsa kaydı (kontroller, ekspertiz dahil)
  ozet jsonb, -- son analiz özeti (tahmini değer, karar)
  notlar text check (notlar is null or length(notlar) <= 4000),
  olusturma timestamptz not null default now(),
  guncelleme timestamptz not null default now(),
  constraint veri_boyutu check (octet_length(veri::text) <= 100000)
);
create index if not exists portfoy_sahip on public.portfoy (sahip, guncelleme desc);

alter table public.musteriler enable row level security;
alter table public.portfoy enable row level security;

do $$
declare t text;
begin
  foreach t in array array['musteriler', 'portfoy'] loop
    execute format('drop policy if exists "sahip okur" on public.%I', t);
    execute format('create policy "sahip okur" on public.%I for select using (sahip = auth.uid())', t);
    execute format('drop policy if exists "sahip ekler" on public.%I', t);
    execute format('create policy "sahip ekler" on public.%I for insert with check (sahip = auth.uid() and public.aktif_mi())', t);
    execute format('drop policy if exists "sahip gunceller" on public.%I', t);
    execute format('create policy "sahip gunceller" on public.%I for update using (sahip = auth.uid()) with check (sahip = auth.uid() and public.aktif_mi())', t);
    execute format('drop policy if exists "sahip siler" on public.%I', t);
    execute format('create policy "sahip siler" on public.%I for delete using (sahip = auth.uid())', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- Portföy kaydı başka bir danışmanın müşterisine bağlanamasın.
create or replace function public.portfoy_musteri_kontrol() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.musteri_id is not null and not exists (select 1 from public.musteriler where id = new.musteri_id and sahip = new.sahip) then
    raise exception 'Müşteri bulunamadı';
  end if;
  new.guncelleme := now();
  return new;
end;
$$;
drop trigger if exists portfoy_musteri_kontrol_tetik on public.portfoy;
create trigger portfoy_musteri_kontrol_tetik before insert or update on public.portfoy
  for each row execute function public.portfoy_musteri_kontrol();

create or replace function public.guncelleme_zamani() returns trigger language plpgsql as $$
begin new.guncelleme := now(); return new; end;
$$;
drop trigger if exists musteriler_guncelleme on public.musteriler;
create trigger musteriler_guncelleme before update on public.musteriler for each row execute function public.guncelleme_zamani();

-- Danışmanın çalıştığı ekspertiz (SPK lisanslı değerleme) firması; rapor kimliğiyle birlikte saklanır.
alter table public.rapor_kimlikleri add column if not exists ekspertiz_firma text;
alter table public.rapor_kimlikleri add column if not exists ekspertiz_eposta text;
alter table public.rapor_kimlikleri add column if not exists ekspertiz_telefon text;

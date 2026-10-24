-- Ev/Arsa Analiz — PDF raporlarında kullanılan ofis/danışman kimliği (logo dahil).
-- Supabase panelinde SQL Editor > New query'ye yapıştırıp bir kez çalıştırın. Tekrar çalıştırmak güvenlidir.
-- Her kullanıcı yalnızca kendi kaydını görür ve değiştirir. Logo, tarayıcıda küçültülmüş bir görsel (data URL) olarak saklanır.

create table if not exists public.rapor_kimlikleri (
  id uuid primary key references auth.users (id) on delete cascade,
  ofis_adi text,
  danisman_adi text,
  unvan text,
  telefon text,
  eposta text,
  adres text,
  web text,
  yetki_belge_no text,
  logo text, -- data:image/png;base64,... (en fazla ~150 KB)
  guncelleme timestamptz not null default now(),
  constraint logo_boyutu check (logo is null or length(logo) <= 200000)
);

alter table public.rapor_kimlikleri enable row level security;

drop policy if exists "kendi kimligini okur" on public.rapor_kimlikleri;
create policy "kendi kimligini okur" on public.rapor_kimlikleri for select using (id = auth.uid());

drop policy if exists "kendi kimligini ekler" on public.rapor_kimlikleri;
create policy "kendi kimligini ekler" on public.rapor_kimlikleri for insert with check (id = auth.uid() and public.aktif_mi());

drop policy if exists "kendi kimligini gunceller" on public.rapor_kimlikleri;
create policy "kendi kimligini gunceller" on public.rapor_kimlikleri for update using (id = auth.uid()) with check (id = auth.uid() and public.aktif_mi());

drop policy if exists "kendi kimligini siler" on public.rapor_kimlikleri;
create policy "kendi kimligini siler" on public.rapor_kimlikleri for delete using (id = auth.uid());

revoke all on public.rapor_kimlikleri from anon;
grant select, insert, update, delete on public.rapor_kimlikleri to authenticated;

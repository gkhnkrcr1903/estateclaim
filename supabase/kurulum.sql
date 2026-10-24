-- Arsa Analiz — kullanıcı, rol ve ayar tabloları (Supabase).
-- Supabase panelinde SQL Editor > New query'ye yapıştırıp bir kez çalıştırın. Tekrar çalıştırmak güvenlidir.
--
-- Yapı:
--   profiller: her kullanıcı için yetkiler (aktif, admin, arsa, ev, pdf). Kayıt olan kullanıcının satırı
--              otomatik açılır, tüm yetkiler kapalıdır; admin onaylayıp yetki verir.
--   ayarlar:   şifreli veri dosyasını açan site şifresi. Yalnızca onaylı (aktif) kullanıcılar okuyabilir.
-- Kullanıcılar kendi yetkilerini değiştiremez; yetkileri yalnızca admin değiştirir.

create table if not exists public.profiller (
  id uuid primary key references auth.users (id) on delete cascade,
  eposta text not null,
  ad text,
  aktif boolean not null default false,
  admin boolean not null default false,
  arsa boolean not null default false,
  ev boolean not null default false,
  pdf boolean not null default false,
  olusturma timestamptz not null default now(),
  son_giris timestamptz
);

create table if not exists public.ayarlar (
  anahtar text primary key,
  deger text not null
);

-- Admin kontrolü (RLS içinde kendi tablosunu sorgularken döngüye girmemek için security definer).
create or replace function public.admin_mi() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select admin and aktif from public.profiller where id = auth.uid()), false);
$$;

create or replace function public.aktif_mi() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select aktif from public.profiller where id = auth.uid()), false);
$$;

-- Yeni kayıt olan kullanıcıya yetkisiz profil açılır. İLK ADMIN: aşağıdaki e-posta kayıt olduğunda
-- otomatik olarak aktif admin olur ve tüm yetkileri alır. Farklı bir e-posta kullanacaksanız değiştirin.
create or replace function public.yeni_kullanici() returns trigger
language plpgsql security definer set search_path = public as $$
declare ilk_admin boolean := lower(new.email) = lower('gkhnkrcr1903@gmail.com');
begin
  insert into public.profiller (id, eposta, ad, aktif, admin, arsa, ev, pdf)
  values (new.id, new.email, new.raw_user_meta_data ->> 'ad', ilk_admin, ilk_admin, ilk_admin, ilk_admin, ilk_admin)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists yeni_kullanici_tetik on auth.users;
create trigger yeni_kullanici_tetik after insert on auth.users
  for each row execute function public.yeni_kullanici();

-- Kullanıcı yalnızca kendi son giriş zamanını güncelleyebilir (yetki alanlarına dokunamaz).
create or replace function public.giris_kaydet() returns void
language sql security definer set search_path = public as $$
  update public.profiller set son_giris = now() where id = auth.uid();
$$;

alter table public.profiller enable row level security;
alter table public.ayarlar enable row level security;

drop policy if exists "kendi profilini gorur" on public.profiller;
create policy "kendi profilini gorur" on public.profiller for select using (id = auth.uid() or public.admin_mi());

drop policy if exists "admin gunceller" on public.profiller;
create policy "admin gunceller" on public.profiller for update using (public.admin_mi()) with check (public.admin_mi());

drop policy if exists "admin siler" on public.profiller;
create policy "admin siler" on public.profiller for delete using (public.admin_mi());

drop policy if exists "aktif kullanici okur" on public.ayarlar;
create policy "aktif kullanici okur" on public.ayarlar for select using (public.aktif_mi());

drop policy if exists "admin ayar yazar" on public.ayarlar;
create policy "admin ayar yazar" on public.ayarlar for all using (public.admin_mi()) with check (public.admin_mi());

-- Doğrudan tablo yetkileri: anonim kullanıcı hiçbir şeye erişemez.
revoke all on public.profiller, public.ayarlar from anon;
grant select, update, delete on public.profiller to authenticated;
grant select, insert, update, delete on public.ayarlar to authenticated;
grant execute on function public.giris_kaydet() to authenticated;

-- Admin kendi admin yetkisini yanlışlıkla kaldırıp paneli kilitlemesin.
create or replace function public.son_admini_koru() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (old.admin and old.aktif) and not (new.admin and new.aktif)
     and (select count(*) from public.profiller where admin and aktif and id <> old.id) = 0 then
    raise exception 'Son aktif admin kaldırılamaz';
  end if;
  return new;
end;
$$;
drop trigger if exists son_admini_koru_tetik on public.profiller;
create trigger son_admini_koru_tetik before update on public.profiller
  for each row execute function public.son_admini_koru();

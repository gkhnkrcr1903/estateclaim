-- Ev/Arsa Analiz — paylaşılabilir rapor bağlantıları.
-- Supabase panelinde SQL Editor > New query'ye yapıştırıp bir kez çalıştırın. Tekrar çalıştırmak güvenlidir.
--
-- Danışman bir raporu paylaştığında hesaplanmış sonucun kopyası (ve rapor kimliği/logo) buraya kaydedilir.
-- Bağlantıdaki kimlik tahmin edilemeyen bir UUID'dir. Giriş yapmamış kişi tabloyu doğrudan okuyamaz; yalnızca
-- paylasim_getir(kimlik) fonksiyonuyla, süresi dolmamış TEK bir paylaşımı görebilir (listeleme yapılamaz).

create table if not exists public.paylasimlar (
  id uuid primary key default gen_random_uuid(),
  sahip uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tur text not null check (tur in ('ev-alici', 'ev-satici')),
  baslik text not null,
  veri jsonb not null,
  olusturma timestamptz not null default now(),
  bitis timestamptz not null default (now() + interval '30 days'),
  goruntulenme integer not null default 0,
  constraint veri_boyutu check (octet_length(veri::text) <= 400000)
);
create index if not exists paylasimlar_sahip on public.paylasimlar (sahip, olusturma desc);

alter table public.paylasimlar enable row level security;

drop policy if exists "sahip okur" on public.paylasimlar;
create policy "sahip okur" on public.paylasimlar for select using (sahip = auth.uid());

drop policy if exists "aktif kullanici paylasir" on public.paylasimlar;
create policy "aktif kullanici paylasir" on public.paylasimlar for insert with check (sahip = auth.uid() and public.aktif_mi());

drop policy if exists "sahip siler" on public.paylasimlar;
create policy "sahip siler" on public.paylasimlar for delete using (sahip = auth.uid());

revoke all on public.paylasimlar from anon;
grant select, insert, delete on public.paylasimlar to authenticated;

-- Herkese açık okuma: yalnızca kimliği bilinen ve süresi dolmamış paylaşım; görüntülenme sayısı artırılır.
create or replace function public.paylasim_getir(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare sonuc jsonb;
begin
  update public.paylasimlar set goruntulenme = goruntulenme + 1
   where id = p_id and bitis > now()
  returning jsonb_build_object('tur', tur, 'baslik', baslik, 'veri', veri, 'olusturma', olusturma, 'bitis', bitis) into sonuc;
  return sonuc;
end;
$$;
revoke all on function public.paylasim_getir(uuid) from public;
grant execute on function public.paylasim_getir(uuid) to anon, authenticated;

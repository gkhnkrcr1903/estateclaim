-- Ev/Arsa Analiz — paylaşımlarda yer tasarrufu (paylasim.sql'den sonra bir kez çalıştırın; tekrar çalıştırmak güvenlidir).
--
-- 1) Paylaşımlar artık logonun kopyasını saklamaz; bağlantı açılırken logo danışmanın rapor kimliğinden okunur.
-- 2) Süresi dolan paylaşımlar, yeni bir paylaşım oluşturulduğunda otomatik silinir (zamanlanmış görev gerekmez).
-- 3) Mevcut paylaşımlardaki logo kopyaları ve süresi dolmuş paylaşımlar hemen temizlenir.

-- Herkese açık okuma: logo, sahibin güncel rapor kimliğinden eklenir.
create or replace function public.paylasim_getir(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  p public.paylasimlar%rowtype;
  logo text;
  veri jsonb;
begin
  update public.paylasimlar set goruntulenme = goruntulenme + 1
   where id = p_id and bitis > now()
  returning * into p;
  if not found then
    return null;
  end if;
  veri := p.veri;
  if jsonb_typeof(veri -> 'kimlik') = 'object' then
    select r.logo into logo from public.rapor_kimlikleri r where r.id = p.sahip;
    veri := jsonb_set(veri, '{kimlik,logo}', coalesce(to_jsonb(logo), 'null'::jsonb));
  end if;
  return jsonb_build_object('tur', p.tur, 'baslik', p.baslik, 'veri', veri, 'olusturma', p.olusturma, 'bitis', p.bitis);
end;
$$;
revoke all on function public.paylasim_getir(uuid) from public;
grant execute on function public.paylasim_getir(uuid) to anon, authenticated;

-- Kaydedilen paylaşımda logo kopyası tutulmaz (eski uygulama sürümü gönderse bile).
create or replace function public.paylasim_logo_cikar() returns trigger
language plpgsql as $$
begin
  if jsonb_typeof(new.veri -> 'kimlik') = 'object' then
    -- Logo ve danışmana özel ekspertiz firması bilgisi paylaşımda tutulmaz.
    new.veri := new.veri #- '{kimlik,logo}' #- '{kimlik,ekspertiz_firma}' #- '{kimlik,ekspertiz_eposta}' #- '{kimlik,ekspertiz_telefon}';
  end if;
  return new;
end;
$$;
drop trigger if exists paylasim_logo_cikar_tetik on public.paylasimlar;
create trigger paylasim_logo_cikar_tetik before insert or update on public.paylasimlar
  for each row execute function public.paylasim_logo_cikar();

-- Süresi dolanları sil: her yeni paylaşımdan sonra (tüm kullanıcılar için) çalışır.
create or replace function public.paylasim_suresi_dolanlari_sil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from public.paylasimlar where bitis < now();
  return null;
end;
$$;
drop trigger if exists paylasim_temizlik_tetik on public.paylasimlar;
create trigger paylasim_temizlik_tetik after insert on public.paylasimlar
  for each statement execute function public.paylasim_suresi_dolanlari_sil();

-- Mevcut kayıtların temizliği
delete from public.paylasimlar where bitis < now();
update public.paylasimlar set veri = veri #- '{kimlik,logo}' where veri -> 'kimlik' ? 'logo';
update public.paylasimlar
   set veri = veri #- '{kimlik,ekspertiz_firma}' #- '{kimlik,ekspertiz_eposta}' #- '{kimlik,ekspertiz_telefon}'
 where veri -> 'kimlik' ? 'ekspertiz_firma';

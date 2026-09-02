-- FIX: USER_ROLE tablosuna CUSER kolonunu ekleyerek kayıt hatasını düzelt
-- Bu SQL'i Supabase Dashboard -> SQL Editor'de çalıştır

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_full_name TEXT;
  v_name VARCHAR(100);
  v_surname VARCHAR(100);
  v_role_id UUID;
  v_provider TEXT;
  v_role_code VARCHAR(50);
BEGIN
  -- Kullanıcının sisteme hangi yöntemle kayıt olduğunu öğren ('azure' veya 'email')
  v_provider := new.raw_app_meta_data->>'provider';

  -- =======================================================
  -- 1. DURUM: MİCROSOFT (AZURE) İLE GİRİŞ YAPAN ÇALIŞANLAR
  -- =======================================================
  IF v_provider = 'azure' THEN
    v_role_code := 'HR'; -- Atanacak rolün GNL_TP tablosundaki kısa kodu
    
    -- İsim ayrıştırma işlemleri (Azure'dan gelen tek parça ismi bölme)
    v_full_name := trim(COALESCE(new.raw_user_meta_data->>'name', 'İsimsiz Çalışan'));

    IF new.raw_user_meta_data->>'given_name' IS NOT NULL AND new.raw_user_meta_data->>'family_name' IS NOT NULL THEN
      v_name := new.raw_user_meta_data->>'given_name';
      v_surname := new.raw_user_meta_data->>'family_name';
    ELSE
      IF position(' ' in v_full_name) > 0 THEN
        v_surname := split_part(v_full_name, ' ', array_length(string_to_array(v_full_name, ' '), 1));
        v_name := trim(substring(v_full_name from 1 for length(v_full_name) - length(v_surname)));
      ELSE
        v_name := v_full_name;
        v_surname := v_full_name;
      END IF;
    END IF;

  -- =======================================================
  -- 2. DURUM: E-POSTA İLE KAYIT OLAN ADAYLAR
  -- =======================================================
  ELSE
    v_role_code := 'CAND'; -- Atanacak rolün GNL_TP tablosundaki kısa kodu
    
    -- Adaylar frontend'den formu doldurduğu için ad ve soyad doğrudan alınır
    v_name := COALESCE(new.raw_user_meta_data->>'name', 'İsimsiz');
    v_surname := COALESCE(new.raw_user_meta_data->>'surname', 'Aday');
  END IF;

  -- Ortak İşlem: USER tablosuna kaydı at
  INSERT INTO public."USER" (
    "USER_ID",
    "NAME",
    "SURNAME",
    "EMAIL",
    "CUSER"
  )
  VALUES (
    new.id,      
    v_name,      
    v_surname,   
    new.email,   
    new.id       
  );

  -- =======================================================
  -- DİNAMİK ROL ATAMASI BÖLÜMÜ (CUSER EKLENDİ)
  -- =======================================================
  
  -- Yukarıdaki IF/ELSE bloğunda belirlenen v_role_code (HR veya CAND) kullanılarak ID bulunur
  SELECT "GNL_TP_ID" INTO v_role_id 
  FROM public."GNL_TP" 
  WHERE "ENT_CODE_NAME" = 'USER_ROLE' AND "SHRT_CODE" = v_role_code 
  LIMIT 1;

  -- Eğer rol bulunduysa, kullanıcı ile ara tabloda eşleştir
  IF v_role_id IS NOT NULL THEN
    INSERT INTO public."USER_ROLE" (
      "USER_ID", 
      "ROLE_TP_ID",
      "CUSER"  -- DÜZELTME: CUSER kolonu eklendi
    ) VALUES (
      new.id, 
      v_role_id,
      new.id   -- DÜZELTME: Kaydı oluşturan kullanıcı ID'si
    );
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Not: Trigger zaten mevcut, sadece fonksiyonu güncelliyoruz
-- Eğer trigger yoksa şunu da çalıştır:
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 1. UPDATE FUNGSI TRIGGER PENDAFTARAN
-- Fungsi ini sekarang menangani nama ma'had dari input user
-- Dan menetapkan role default sebagai 'pending' (butuh approval)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_org_id uuid;
  mahad_name text;
  user_role text;
BEGIN
  -- Ambil nama mahad dari metadata form pendaftaran (jika ada), default ke 'Ma''had Baru'
  mahad_name := COALESCE(new.raw_user_meta_data->>'mahad_name', 'Ma''had Baru');
  
  -- Ambil role dari metadata (jika dibuat dari dashboard admin), jika daftar sendiri default 'pending'
  user_role := COALESCE(new.raw_user_meta_data->>'role', 'pending');

  -- 1. Buat Organisasi
  INSERT INTO public.organizations (name)
  VALUES (mahad_name)
  RETURNING id INTO new_org_id;

  -- 2. Buat Profil dengan role yang sesuai
  INSERT INTO public.profiles (id, organization_id, full_name, role, email)
  VALUES (new.id, new_org_id, new.raw_user_meta_data->>'full_name', user_role, new.email);

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- (Trigger on_auth_user_created sudah ada, tidak perlu di-drop create jika nama fungsi sama, 
--  tapi untuk memastikan versi terbaru dipakai, replace function sudah cukup)


-- 1. Tambahkan kolom email ke tabel profiles (untuk display di admin panel)
ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "email" text;

-- 2. Buat Fungsi Trigger untuk menyalin email dari auth.users ke public.profiles saat signup
CREATE OR REPLACE FUNCTION public.sync_user_email()
RETURNS trigger AS $$
BEGIN
  -- Update row profile yang baru dibuat dengan email dari auth.users
  UPDATE public.profiles
  SET email = NEW.email
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger dijalankan setelah Insert di profiles (karena profiles dibuat via trigger handle_new_user)
DROP TRIGGER IF EXISTS on_profile_created_sync_email ON public.profiles;
-- Note: Kita pasang di tabel profiles agar lebih rapi, atau bisa update fungsi handle_new_user yang lama.
-- Cara paling aman update fungsi handle_new_user yang sudah ada:

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_org_id uuid;
BEGIN
  -- 1. Buat Organisasi Baru
  INSERT INTO public.organizations (name)
  VALUES ('Ma''had Baru')
  RETURNING id INTO new_org_id;

  -- 2. Buat Profil User dan link ke Organisasi tadi, SERTA SIMPAN EMAIL
  INSERT INTO public.profiles (id, organization_id, full_name, role, email)
  VALUES (new.id, new_org_id, new.raw_user_meta_data->>'full_name', 'admin', new.email);

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. UPDATE DATA LAMA (Jika ada user yang sudah register sebelum script ini)
-- Ini butuh hak akses superuser database, jika gagal di UI Supabase, abaikan dan isi manual nanti.
-- Workaround: Admin panel akan kosong emailnya untuk user lama, tapi user baru aman.

-- 4. SET SUPER ADMIN KHUSUS
-- Mengubah user dengan email tertentu menjadi super_admin
-- CATATAN: User harus sudah signup/login setidaknya sekali agar ada di tabel profiles.
UPDATE public.profiles
SET role = 'super_admin'
WHERE email = 'jabdtech2025@gmail.com';

-- 5. UPDATE RLS POLICIES (KUNCI UTAMA SUPER ADMIN)
-- Kita harus mengubah policy agar Super Admin bisa melihat SEMUA data.

-- Hapus policy lama yang membatasi view profile
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;

-- Buat policy baru yang lebih fleksibel
CREATE POLICY "Users can view own profile OR Super Admin views all" ON profiles
FOR SELECT USING (
  id = auth.uid() -- User biasa lihat punya sendiri
  OR 
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin' -- Super admin lihat semua
);

-- Izinkan Super Admin UPDATE profile siapa saja
CREATE POLICY "Super Admin can update any profile" ON profiles
FOR UPDATE USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
);

-- Izinkan Super Admin DELETE profile (Hati-hati: ini hanya hapus profile, user auth tetap ada tapi tidak bisa login app)
CREATE POLICY "Super Admin can delete any profile" ON profiles
FOR DELETE USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
);

-- Update Policy Organizations agar Super Admin bisa melihat semua nama Ma'had
DROP POLICY IF EXISTS "Users can view their own organization" ON organizations;

CREATE POLICY "Users view own org OR Super Admin views all" ON organizations
FOR SELECT USING (
  id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  OR
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
);

-- SELESAI

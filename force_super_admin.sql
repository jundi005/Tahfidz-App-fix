
-- 1. SINKRONISASI EMAIL (CRITICAL STEP)
-- Mengisi kolom email di tabel profiles yang masih kosong dengan mengambil data dari auth.users
-- Ini memastikan user lama memiliki data email yang terbaca di tabel profiles.
UPDATE public.profiles
SET email = (
    SELECT email 
    FROM auth.users 
    WHERE auth.users.id = public.profiles.id
)
WHERE email IS NULL OR email = '';

-- 2. SET SUPER ADMIN
-- Sekarang update role akan berhasil karena kolom email sudah terisi
UPDATE public.profiles
SET role = 'super_admin'
WHERE email = 'jabdtech2025@gmail.com';

-- 3. PASTIKAN RLS PERMIT
-- (Opsional, untuk memastikan ulang policy profile bisa dibaca oleh pemiliknya sendiri untuk pengecekan role di frontend)
DROP POLICY IF EXISTS "View Profiles" ON profiles;
CREATE POLICY "View Profiles" ON profiles
FOR SELECT USING (
  id = auth.uid() OR is_super_admin()
);

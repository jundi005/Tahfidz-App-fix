
-- 1. Hapus Policy yang menyebabkan error Recursion
DROP POLICY IF EXISTS "Users can view own profile OR Super Admin views all" ON profiles;
DROP POLICY IF EXISTS "Super Admin can update any profile" ON profiles;
DROP POLICY IF EXISTS "Super Admin can delete any profile" ON profiles;
DROP POLICY IF EXISTS "Users view own org OR Super Admin views all" ON organizations;

-- 2. Buat Fungsi Helper 'is_super_admin' dengan SECURITY DEFINER
-- SECURITY DEFINER penting: fungsi ini berjalan dengan hak akses pembuat fungsi (bypass RLS), 
-- sehingga tidak memicu infinite loop saat mengecek tabel profiles.
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. PERBAIKI POLICY: PROFILES (Untuk Halaman Users)
-- Super Admin boleh melihat, edit, hapus SEMUA profile.
-- User biasa hanya boleh melihat profile sendiri.

CREATE POLICY "View Profiles" ON profiles
FOR SELECT USING (
  id = auth.uid() OR is_super_admin()
);

CREATE POLICY "Update Profiles" ON profiles
FOR UPDATE USING (
  id = auth.uid() OR is_super_admin()
);

CREATE POLICY "Delete Profiles" ON profiles
FOR DELETE USING (
  is_super_admin() -- Hanya super admin boleh delete user via aplikasi
);

-- 4. PERBAIKI POLICY: ORGANIZATIONS (Untuk Halaman Users menampilkan nama Ma'had)
-- Super Admin perlu melihat semua nama organisasi untuk list di halaman Users.
-- User biasa hanya melihat organisasi mereka sendiri.

CREATE POLICY "View Organizations" ON organizations
FOR SELECT USING (
  id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  OR is_super_admin()
);

-- 5. PASTIKAN DATA OPERASIONAL TERISOLASI (Dashboard Bersih)
-- Kita TIDAK menambahkan 'OR is_super_admin()' di tabel data (Santri, Attendance, dll).
-- Ini memastikan Super Admin saat membuka Dashboard HANYA melihat data miliknya sendiri,
-- bukan data gabungan seluruh dunia.

-- Cek ulang policy santri (pastikan sudah benar dari script multi-tenant sebelumnya)
DROP POLICY IF EXISTS "Tenant Isolation Santri" ON santri;
CREATE POLICY "Tenant Isolation Santri" ON santri
    USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()))
    WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Lakukan hal yang sama untuk tabel vital lainnya jika belum strict
-- (Biasanya script multi_tenant_schema.sql sudah menangani ini, tapi ini untuk memastikan).

-- Selesai. Error recursion hilang, Dashboard bersih, Halaman Users bisa akses semua.

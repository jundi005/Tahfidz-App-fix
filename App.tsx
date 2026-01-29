
import React, { useState, useCallback, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Attendance from './pages/Attendance';
import AttendanceBook from './pages/AttendanceBook';
import StudentProgress from './pages/StudentProgress';
import Login from './pages/Login';
import Informasi from './pages/Informasi';
import Users from './pages/Users';
import ChatWidget from './components/ChatWidget';

// DATA MASTER PAGES
import SantriPage from './pages/DataMaster/SantriPage';
import MusammiPage from './pages/DataMaster/MusammiPage';
import WaliKelasPage from './pages/DataMaster/WaliKelasPage';
import WaliSantriDataPage from './pages/DataMaster/WaliSantriDataPage';
import HalaqahPage from './pages/DataMaster/HalaqahPage';

// AKADEMIK PAGES
import EvaluasiPage from './pages/EvaluasiPage';

// LAPORAN PAGES
import LaporanRekapPage from './pages/Laporan/LaporanRekapPage';
import LaporanKelasPage from './pages/Laporan/LaporanKelasPage';
import LaporanWaktuPage from './pages/Laporan/LaporanWaktuPage';

import type { Page } from './types';
import { supabase } from './lib/supabaseClient';
import { Lock, LogOut } from 'lucide-react';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('Dashboard');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Organization State
  const [orgDetails, setOrgDetails] = useState<{name: string, logo: string} | null>(null);
  const [userProfile, setUserProfile] = useState<{name: string, role: string} | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const fetchUserOrganization = async (userId: string) => {
      try {
          const { data: profile, error } = await supabase
              .from('profiles')
              .select(`organization_id, role, full_name, organizations ( name, logo_url )`)
              .eq('id', userId)
              .single();
          
          if (profile) {
              setUserProfile({ name: profile.full_name || 'Admin', role: profile.role });
              if (profile.role === 'super_admin') { setIsSuperAdmin(true); setIsPending(false); } 
              else if (profile.role === 'pending') { setIsPending(true); setIsSuperAdmin(false); } 
              else { setIsSuperAdmin(false); setIsPending(false); }

              if (profile.organizations) {
                  setOrgDetails({
                      // @ts-ignore
                      name: profile.organizations.name,
                      // @ts-ignore
                      logo: profile.organizations.logo_url
                  });
              }
          }
      } catch (e) { console.error("Failed to fetch organization", e); }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) fetchUserOrganization(session.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) fetchUserOrganization(session.user.id);
      else { setOrgDetails(null); setUserProfile(null); setIsSuperAdmin(false); setIsPending(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSetPage = useCallback((page: Page) => {
    setCurrentPage(page);
    if(window.innerWidth < 768) setSidebarOpen(false);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentPage('Dashboard');
    setIsSuperAdmin(false);
    setIsPending(false);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'Dashboard': return <Dashboard />;
      case 'Pusat Informasi': return <Informasi />;
      case 'Absensi': return <Attendance />;
      
      // DATA MASTER
      case 'Manajemen Data': 
      case 'DataSantri': return <SantriPage />;
      case 'DataMusammi': return <MusammiPage />;
      case 'DataHalaqah': return <HalaqahPage />;
      case 'DataWaliKelas': return <WaliKelasPage />;
      case 'DataWaliSantri': return <WaliSantriDataPage />;

      // AKADEMIK
      case 'Akademik':
      case 'Perkembangan Santri': return <StudentProgress />;
      case 'EvaluasiSantri': return <EvaluasiPage />;
      case 'Buku Absensi': return <AttendanceBook />;
      
      // LAPORAN
      case 'Laporan':
      case 'LaporanRekap': return <LaporanRekapPage />;
      case 'LaporanKelas': return <LaporanKelasPage />;
      case 'LaporanWaktu': return <LaporanWaktuPage />;

      case 'Users': return isSuperAdmin ? <Users /> : <Dashboard />;
      default: return <Dashboard />;
    }
  };
  
  if (loading) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-neutral text-slate-600 flex-col gap-4">
             <div className="w-10 h-10 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div>
             <p className="text-sm font-medium animate-pulse">Memuat Aplikasi...</p>
        </div>
    );
  }

  if (!session) return <Login />;

  if (isPending) {
      return (
          <div className="flex h-screen w-full items-center justify-center bg-neutral p-4">
              <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200 max-w-md text-center">
                  <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4"><Lock size={32} className="text-yellow-600" /></div>
                  <h2 className="text-xl font-bold text-slate-800 mb-2">Akun Menunggu Persetujuan</h2>
                  <p className="text-slate-600 mb-6 text-sm leading-relaxed">Pendaftaran Anda berhasil, namun akun ini belum diaktifkan oleh Super Admin.</p>
                  <button onClick={handleLogout} className="inline-flex items-center justify-center bg-white border border-slate-300 text-slate-700 font-semibold py-2 px-6 rounded-lg hover:bg-slate-50 transition-colors w-full"><LogOut size={16} className="mr-2" /> Keluar</button>
              </div>
          </div>
      );
  }

  return (
    <div className="flex h-screen bg-neutral text-base-100">
      <Sidebar 
        currentPage={currentPage} setPage={handleSetPage} 
        isOpen={isSidebarOpen} setOpen={setSidebarOpen}
        isCollapsed={isSidebarCollapsed} setCollapsed={setSidebarCollapsed}
        isSuperAdmin={isSuperAdmin}
      />
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <Header 
          currentPage={currentPage} toggleSidebar={() => setSidebarOpen(!isSidebarOpen)}
          isSidebarCollapsed={isSidebarCollapsed} toggleSidebarCollapse={() => setSidebarCollapsed(!isSidebarCollapsed)}
          onLogout={handleLogout} orgName={orgDetails?.name} orgLogo={orgDetails?.logo} userName={userProfile?.name} userRole={userProfile?.role}
        />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-neutral p-4 sm:p-6 lg:p-8">
          {renderPage()}
        </main>
        <ChatWidget />
      </div>
    </div>
  );
};

export default App;

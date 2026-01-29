
import React, { useState, useEffect } from 'react';
import type { Page } from '../types';
import { 
  Home, CheckSquare, Users, BookOpen, BarChart2, X, Megaphone, 
  Book, TrendingUp, ShieldCheck, User, ChevronDown, ChevronRight,
  Database, FileText, Circle, ClipboardList
} from 'lucide-react';

interface SidebarProps {
  currentPage: Page;
  setPage: (page: Page) => void;
  isOpen: boolean;
  setOpen: (isOpen: boolean) => void;
  isCollapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  orgName?: string;
  orgLogo?: string;
  isSuperAdmin?: boolean;
}

interface NavItemConfig {
  id: string; // Unique ID for state management
  label: string;
  icon: React.ReactNode;
  page?: Page; // If it's a direct link
  children?: NavItemConfig[]; // If it's a parent menu
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, setPage, isOpen, setOpen, isCollapsed, isSuperAdmin }) => {
  // State to track expanded menus (array of IDs)
  // UPDATED: Default is empty array so all submenus are collapsed initially
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);

  // Handle toggling sub-menus
  const toggleMenu = (id: string) => {
    setExpandedMenus(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Define Navigation Structure
  const navStructure: NavItemConfig[] = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: <Home size={20} />, 
      page: 'Dashboard' 
    },
    { 
      id: 'absensi', 
      label: 'Absensi Harian', 
      icon: <CheckSquare size={20} />, 
      page: 'Absensi' 
    },
    { 
      id: 'buku_absensi', 
      label: 'Buku Absensi', 
      icon: <Book size={20} />, 
      page: 'Buku Absensi' 
    },
    {
      id: 'data',
      label: 'Manajemen Data',
      icon: <Database size={20} />,
      children: [
        { id: 'data_santri', label: 'Data Santri', icon: <Circle size={8} />, page: 'DataSantri' },
        { id: 'data_musammi', label: 'Data Musammi', icon: <Circle size={8} />, page: 'DataMusammi' },
        { id: 'data_halaqah', label: 'Data Halaqah', icon: <Circle size={8} />, page: 'DataHalaqah' },
        { id: 'data_wali', label: 'Data Wali Kelas', icon: <Circle size={8} />, page: 'DataWaliKelas' },
        { id: 'data_wali_santri', label: 'Data Wali Santri', icon: <Circle size={8} />, page: 'DataWaliSantri' },
      ]
    },
    {
        id: 'akademik',
        label: 'Akademik',
        icon: <TrendingUp size={20} />,
        children: [
            { id: 'perkembangan', label: 'Perkembangan', icon: <Circle size={8} />, page: 'Perkembangan Santri' },
            { id: 'evaluasi', label: 'Evaluasi Bulanan', icon: <Circle size={8} />, page: 'EvaluasiSantri' },
        ]
    },
    { 
      id: 'informasi', 
      label: 'Pusat Informasi', 
      icon: <Megaphone size={20} />, 
      page: 'Pusat Informasi' 
    },
    {
      id: 'laporan',
      label: 'Laporan & Statistik',
      icon: <BarChart2 size={20} />,
      children: [
        { id: 'lap_rekap', label: 'Rekapitulasi Utama', icon: <Circle size={8} />, page: 'LaporanRekap' },
        { id: 'lap_kelas', label: 'Laporan Per Kelas', icon: <Circle size={8} />, page: 'LaporanKelas' },
        { id: 'lap_waktu', label: 'Laporan Per Waktu', icon: <Circle size={8} />, page: 'LaporanWaktu' },
      ]
    }
  ];

  if (isSuperAdmin) {
      navStructure.push({ 
        id: 'users', 
        label: 'Users Admin', 
        icon: <ShieldCheck size={20} />, 
        page: 'Users' 
      });
  }

  // Helper to render items recursively
  const renderNavItem = (item: NavItemConfig, depth: number = 0) => {
    const isParent = item.children && item.children.length > 0;
    const isExpanded = expandedMenus.includes(item.id);
    const isActive = item.page === currentPage || (isParent && item.children?.some(c => c.page === currentPage));
    
    // Padding logic for depth
    const paddingLeft = depth === 0 ? '0.75rem' : `${depth * 1.5 + 0.75}rem`;

    return (
      <li key={item.id} className="mb-1">
        {isParent ? (
          // Parent Item (Dropdown Toggle)
          <button
            onClick={() => toggleMenu(item.id)}
            className={`w-full flex items-center justify-between p-3 rounded-lg text-sm font-medium transition-colors duration-200 
              ${isActive ? 'text-secondary bg-blue-50/50' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'}
            `}
            style={{ paddingLeft: depth === 0 ? '0.75rem' : '0.75rem' }} // Keep parent padding consistent, indent children
          >
            <div className="flex items-center">
              <div className={`flex-shrink-0 ${isActive ? 'text-secondary' : 'text-slate-500'}`}>{item.icon}</div>
              {!isCollapsed && <span className="ml-3 whitespace-nowrap">{item.label}</span>}
            </div>
            {!isCollapsed && (
              <div className="text-slate-400">
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </div>
            )}
          </button>
        ) : (
          // Leaf Item (Link)
          <a
            href="#"
            onClick={(e) => { 
              e.preventDefault(); 
              if(item.page) setPage(item.page); 
            }}
            className={`flex items-center p-3 rounded-lg text-sm font-medium transition-all duration-200
              ${item.page === currentPage 
                ? 'bg-blue-50 text-secondary border-r-4 border-secondary' 
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
            `}
            style={{ paddingLeft }}
          >
            <div className={`flex-shrink-0 ${item.page === currentPage ? 'text-secondary' : 'text-slate-400'}`}>
              {item.icon}
            </div>
            {!isCollapsed && <span className="ml-3 whitespace-nowrap">{item.label}</span>}
          </a>
        )}

        {/* Render Children */}
        {isParent && !isCollapsed && isExpanded && (
          <ul className="mt-1 space-y-1 animate-in slide-in-from-top-2 duration-200">
            {item.children?.map(child => renderNavItem(child, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  // Hardcoded Logo and Text per Request
  const displayLogo = "https://i.ibb.co.com/KcYyzZRz/Tanpa-judul-1080-x-1080-piksel-20260116-084021-0000.png";
  const mainTitle = "Lajnah Al qur'an";
  const subTitle = "Tahfidz App";

  return (
    <>
      {/* Mobile Overlay */}
      <div className={`fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setOpen(false)}></div>
      
      <aside 
        className={`flex flex-col h-full bg-white z-40 border-r border-slate-200
          fixed md:relative inset-y-0 left-0
          transform transition-all duration-300 ease-in-out 
          ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
          md:transform-none
          ${isCollapsed ? 'md:w-0 md:border-none overflow-hidden' : 'md:w-64'}
        `}
      >
          <div className="flex-grow flex flex-col min-h-0 w-64"> 
            {/* Header */}
            <div className="relative flex flex-col items-center justify-center border-b border-slate-200 flex-shrink-0 py-6">
                 <button className="md:hidden absolute top-2 right-2 text-slate-500 hover:text-error" onClick={() => setOpen(false)}>
                    <X size={24} />
                </button>

                <div className="w-16 h-16 mb-2">
                     <img 
                        src={displayLogo} 
                        alt="Logo App" 
                        className="w-full h-full object-contain drop-shadow-sm"
                        onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/100x100?text=Logo"; }}
                     />
                </div>
                
                <div className="text-center px-4 w-full">
                    <h1 className="text-lg font-bold text-slate-800 break-words leading-tight">{mainTitle}</h1>
                    <p className="text-[10px] text-slate-500 font-medium mt-1 tracking-wider uppercase">{subTitle}</p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-grow p-3 overflow-y-auto overflow-x-hidden custom-scrollbar">
                <ul className="space-y-1">
                    {navStructure.map(item => renderNavItem(item))}
                </ul>
            </nav>
            
            {/* Footer / Version */}
            <div className="p-4 border-t border-slate-200 text-center">
               <p className="text-[10px] text-slate-400">v2.1.0 Multi-Page</p>
            </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

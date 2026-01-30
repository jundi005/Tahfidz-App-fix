
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
      label: 'Absensi',
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
      label: 'Perkembangan',
      icon: <TrendingUp size={20} />,
      children: [
        { id: 'perkembangan', label: 'Input Perkembangan', icon: <Circle size={8} />, page: 'Perkembangan Santri' },
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
      label: 'Laporan',
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

    // Styling Logic - Clean & Elegant
    const baseClasses = "flex items-center w-full p-3 mb-1 rounded-xl transition-all duration-200 group";
    const activeClasses = "bg-blue-50 text-blue-700 font-semibold";
    // Changed inactive color to text-slate-800
    const inactiveClasses = "text-slate-800 hover:text-slate-900 hover:bg-slate-50";

    const itemClass = `${baseClasses} ${isActive ? activeClasses : inactiveClasses}`;

    return (
      <li key={item.id} className="px-3">
        {isParent ? (
          // Parent Item (Dropdown Toggle)
          <button
            onClick={() => toggleMenu(item.id)}
            className={`${itemClass} justify-between`}
          >
            <div className="flex items-center">
              <div className={`flex-shrink-0 transition-colors ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
                {item.icon}
              </div>
              {/* Always show text, we hide the whole sidebar on collapse now */}
              <span className="ml-3 text-base whitespace-nowrap">{item.label}</span>
            </div>
            <div className={`transition-transform duration-200 ${isActive ? 'text-blue-400' : 'text-slate-300'} ${isExpanded ? 'rotate-180' : ''}`}>
              <ChevronDown size={16} />
            </div>
          </button>
        ) : (
          // Leaf Item (Link)
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (item.page) setPage(item.page);
            }}
            className={itemClass}
          >
            <div className={`flex-shrink-0 transition-colors ${item.page === currentPage ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
              {item.icon}
            </div>
            {/* Always show text, we hide the whole sidebar on collapse now */}
            <span className="ml-3 text-base whitespace-nowrap">{item.label}</span>
          </a>
        )}

        {/* Render Children */}
        {isParent && isExpanded && (
          <ul className="mt-1 space-y-0.5 ml-4 border-l border-slate-100 pl-2 animate-in slide-in-from-top-2 duration-200">
            {item.children?.map(child => {
              const isChildActive = child.page === currentPage;
              return (
                <li key={child.id}>
                  <a
                    href="#"
                    onClick={(e) => { e.preventDefault(); if (child.page) setPage(child.page); }}
                    // Changed text-sm to text-base and updated inactive colors
                    className={`flex items-center py-2 px-3 rounded-lg text-base transition-colors ${isChildActive
                        ? 'text-blue-600 bg-blue-50 font-medium'
                        : 'text-slate-800 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                  >
                    <span className="mr-3 opacity-50">{child.icon}</span>
                    <span className="whitespace-nowrap">{child.label}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </li>
    );
  };

  // Hardcoded Logo and Text per Request
  const displayLogo = "https://i.ibb.co.com/KcYyzZRz/Tanpa-judul-1080-x-1080-piksel-20260116-084021-0000.png";

  return (
    <>
      {/* Mobile Overlay */}
      <div className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-30 md:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setOpen(false)}></div>

      <aside
        className={`flex flex-col h-full bg-white z-40 border-r border-slate-100
          fixed md:relative inset-y-0 left-0
          transform transition-all duration-300 ease-in-out 
          overflow-hidden
          w-[280px] 
          ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
          md:transform-none
          ${isCollapsed ? 'md:w-0 md:border-none' : 'md:w-[280px]'}
        `}
      >
        <div className="flex-grow flex flex-col min-h-0 w-[280px]">
          {/* Header - Simple & Clean */}
          <div className="flex flex-col items-center justify-center pt-8 pb-6 px-4">
            <button className="md:hidden absolute top-4 right-4 text-slate-400 hover:text-slate-700" onClick={() => setOpen(false)}>
              <X size={20} />
            </button>

            <div className="w-16 h-16 mb-4 relative group">
              <div className="absolute inset-0 bg-blue-100 rounded-2xl rotate-6 group-hover:rotate-12 transition-transform duration-300 opacity-50"></div>
              <img
                src={displayLogo}
                alt="Logo App"
                className="w-full h-full object-contain relative z-10 drop-shadow-sm"
                onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/100x100?text=Logo"; }}
              />
            </div>

            <div className="text-center animate-in fade-in zoom-in duration-300">
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">Tahfidz App</h1>
              {/* Removed 'uppercase' class */}
              <p className="text-xs text-slate-400 font-medium mt-0.5 tracking-wide">Sistem Absensi</p>
            </div>
          </div>

          {/* Navigation - Elegant List */}
          <nav className="flex-grow overflow-y-auto custom-scrollbar py-2">
            <ul className="space-y-1">
              {navStructure.map(item => renderNavItem(item))}
            </ul>
          </nav>

          {/* Footer / Version */ }
          {/* Footer Compact */}
          {/* Footer Minimalist */}
          {!isCollapsed && (
            <div className="px-6 py-4 mt-auto border-t border-slate-50">
              <div className="text-center space-y-1">
                <p className="text-xs text-slate-500 font-medium tracking-wide">
                  Lajnah Al-Quran
                </p>
                <p className="text-[10px] text-slate-300">
                  © {new Date().getFullYear()} • All rights reserved
                </p>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;









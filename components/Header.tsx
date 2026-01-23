
import React, { useState, useRef, useEffect } from 'react';
import type { Page } from '../types';
import { Menu, LogOut, ChevronDown } from 'lucide-react';

interface HeaderProps {
    currentPage: Page;
    toggleSidebar: () => void;
    isSidebarCollapsed: boolean;
    toggleSidebarCollapse: () => void;
    onLogout: () => void;
    orgName?: string;
    orgLogo?: string;
    userName?: string;
    userRole?: string;
}

const Header: React.FC<HeaderProps> = ({ 
    currentPage, 
    toggleSidebar, 
    isSidebarCollapsed, 
    toggleSidebarCollapse, 
    onLogout, 
    orgName, 
    orgLogo,
    userName,
    userRole
}) => {
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuClick = () => {
      if (window.innerWidth >= 768) {
          // Desktop: Toggle Collapse
          toggleSidebarCollapse();
      } else {
          // Mobile: Toggle Drawer
          toggleSidebar();
      }
  };

  // Fallback Logo (Logo Login) if orgLogo is not provided
  const displayLogo = orgLogo || "https://i.ibb.co.com/KcYyzZRz/Tanpa-judul-1080-x-1080-piksel-20260116-084021-0000.png";
  
  // Format Role for Display
  const formatRole = (role?: string) => {
      if (!role) return 'Staff';
      if (role === 'super_admin') return 'Super Admin';
      if (role === 'admin') return 'Admin Ma\'had';
      return role.charAt(0).toUpperCase() + role.slice(1);
  };

  return (
    <header className="bg-primary border-b border-slate-200 z-10 transition-all duration-300">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center">
            <button
                onClick={handleMenuClick}
                className="text-slate-600 mr-4 p-2 rounded-full hover:bg-slate-100 focus:outline-none"
                aria-label="Toggle sidebar"
            >
                <Menu size={24} />
            </button>
            <h1 className="text-xl font-bold text-slate-800">{currentPage}</h1>
        </div>
        
        <div className="flex items-center space-x-4">
            {/* Nama Ma'had di samping kiri button */}
            {orgName && (
                <div className="hidden md:block text-right">
                    <span className="text-sm font-bold text-slate-700 block">{orgName}</span>
                </div>
            )}

            <div className="relative" ref={dropdownRef}>
                <button onClick={() => setDropdownOpen(!isDropdownOpen)} className="flex items-center space-x-2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-left">
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 bg-white flex-shrink-0">
                        <img 
                            src={displayLogo} 
                            alt="Logo" 
                            className="w-full h-full object-contain" 
                            onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/100x100?text=User"; }}
                        />
                    </div>
                    <div className="hidden sm:block">
                        <p className="text-sm font-bold text-slate-800 leading-tight">{userName || 'Admin'}</p>
                        <p className="text-[10px] text-slate-500 font-medium leading-tight">{formatRole(userRole)}</p>
                    </div>
                    <ChevronDown size={16} className={`text-slate-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-primary rounded-md shadow-lg py-1 z-20 border border-slate-200">
                        {/* Mobile view of Org Name inside dropdown if hidden */}
                        <div className="md:hidden px-4 py-2 border-b border-slate-100 mb-1">
                             <p className="text-xs text-slate-400 font-medium">Organisasi</p>
                             <p className="text-sm font-bold text-slate-700 truncate">{orgName || "Ma'had Al Faruq"}</p>
                        </div>
                        <button 
                            onClick={() => {
                                onLogout();
                                setDropdownOpen(false);
                            }} 
                            className="w-full text-left flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-error"
                        >
                            <LogOut size={16} className="mr-2" />
                            Logout
                        </button>
                    </div>
                )}
            </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { 
  Menu, Bell, Settings, HelpCircle, LogOut, Search, User, Globe, 
  Terminal, LayoutGrid, ChevronDown, Activity, ShieldCheck, HardDrive, Network 
} from 'lucide-react';

interface AWSLayoutProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  onNavigateToZone: (zoneId: number, initialSearch?: string) => void;
  children: React.ReactNode;
}

export function AWSLayout({ currentTab, onTabChange, onNavigateToZone, children }: AWSLayoutProps) {
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ zones: any[]; records: any[] }>({ zones: [], records: [] });
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Handle global search API call
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults({ zones: [], records: [] });
      return;
    }

    const delayDebounce = setTimeout(async () => {
      try {
        const res = await fetch(`/api/global-search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch (err) {
        console.error('Error fetching global search results:', err);
      }
    }, 200);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Close search results dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleZoneClick = (zoneId: number) => {
    onNavigateToZone(zoneId);
    setSearchQuery('');
    setShowSearchResults(false);
  };

  const handleRecordClick = (zoneId: number, name: string) => {
    onNavigateToZone(zoneId, name);
    setSearchQuery('');
    setShowSearchResults(false);
  };

  const navItems = [
    { name: 'Dashboard', icon: <LayoutGrid className="w-4 h-4" /> },
    { name: 'Hosted Zones', icon: <Globe className="w-4 h-4" /> },
    { name: 'Traffic Policies', icon: <Network className="w-4 h-4 text-aws-text-muted" /> },
    { name: 'Health Checks', icon: <Activity className="w-4 h-4 text-aws-text-muted" /> },
    { name: 'Resolver', icon: <HardDrive className="w-4 h-4 text-aws-text-muted" /> },
    { name: 'Profiles', icon: <ShieldCheck className="w-4 h-4 text-aws-text-muted" /> },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#eaeded] text-aws-text font-sans" id="aws-console-layout">
      {/* 1. AWS Global Header */}
      <header className="bg-aws-navy text-white h-[48px] px-3 flex items-center justify-between shrink-0 relative z-50 shadow">
        {/* Left Section: Logo & Brand */}
        <div className="flex items-center space-x-4">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 hover:bg-[#344256] rounded text-white cursor-pointer md:block">
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-1.5 cursor-pointer select-none" onClick={() => onTabChange('Dashboard')}>
            {/* Minimal AWS Box logo */}
            <div className="bg-[#ff9900] text-[#16191f] font-bold text-[11px] px-1.5 py-0.5 rounded leading-none shrink-0">
              aws
            </div>
            <span className="font-bold text-sm tracking-tight hidden sm:inline-block">Console</span>
          </div>

          <div className="h-4 w-[1px] bg-gray-600 hidden md:block"></div>

          <span className="text-xs font-semibold text-gray-300 hidden md:inline-block cursor-pointer hover:text-white" onClick={() => onTabChange('Dashboard')}>
            Route 53
          </span>
        </div>

        {/* Middle Section: Global Instant Search Bar */}
        <div className="flex-1 max-w-xl mx-4 relative" ref={searchRef}>
          <div className="relative">
            <input
              type="text"
              placeholder="Search Route 53 resources globally (e.g. example.com, test.local)..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchResults(true);
              }}
              onFocus={() => setShowSearchResults(true)}
              className="w-full bg-[#2a384a] text-sm text-white placeholder-gray-400 pl-9 pr-4 py-1.5 rounded border border-gray-600 outline-none focus:bg-white focus:text-[#16191f] focus:placeholder-gray-500 focus:border-[#ff9900] transition"
            />
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Instant Search Dropdown */}
          {showSearchResults && (searchQuery.trim().length >= 2) && (
            <div className="absolute top-[40px] left-0 right-0 bg-white border border-[#b8c2cc] shadow-xl rounded text-aws-text overflow-hidden max-h-[400px] overflow-y-auto z-50">
              <div className="p-2.5 bg-[#f2f3f3] text-[11px] font-bold text-aws-text-muted border-b border-gray-200">
                GLOBAL SEARCH RESULTS FOR "{searchQuery.toUpperCase()}"
              </div>

              {/* Hosted Zone Matches */}
              {searchResults.zones.length > 0 && (
                <div>
                  <div className="px-3 py-1 bg-gray-50 text-[10px] font-bold text-gray-400">HOSTED ZONES</div>
                  {searchResults.zones.map((zone) => (
                    <button
                      key={zone.id}
                      onClick={() => handleZoneClick(zone.id)}
                      className="w-full text-left px-4 py-2 hover:bg-[#e2f0fd] text-xs flex items-center justify-between border-b border-gray-100"
                    >
                      <div className="flex items-center space-x-2">
                        <Globe className="w-3.5 h-3.5 text-[#0073bb]" />
                        <span className="font-bold text-[#0073bb]">{zone.name}</span>
                        <span className="text-gray-400">({zone.type})</span>
                      </div>
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                        {zone.record_count} records
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* DNS Record Matches */}
              {searchResults.records.length > 0 && (
                <div>
                  <div className="px-3 py-1 bg-gray-50 text-[10px] font-bold text-gray-400">DNS RECORDS</div>
                  {searchResults.records.map((rec) => (
                    <button
                      key={rec.id}
                      onClick={() => handleRecordClick(rec.hosted_zone_id, rec.name)}
                      className="w-full text-left px-4 py-2 hover:bg-[#e2f0fd] text-xs flex flex-col border-b border-gray-100"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-aws-text">{rec.name}</span>
                        <span className="text-[10px] bg-[#e2f0fd] text-[#0073bb] px-1 rounded font-bold">{rec.type}</span>
                      </div>
                      <div className="text-[11px] text-aws-text-muted truncate mt-0.5">
                        Value: {rec.value} <span className="text-gray-300">|</span> Zone: {rec.zone_name}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {searchResults.zones.length === 0 && searchResults.records.length === 0 && (
                <div className="p-4 text-center text-xs text-aws-text-muted">
                  No Route53 resources found matching "{searchQuery}"
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Section: Actions & Profile */}
        <div className="flex items-center space-x-2.5">
          {/* Simulated Toolbar Utilities */}
          <button className="p-1.5 hover:bg-[#344256] rounded text-white transition cursor-pointer" title="Simulated CloudShell">
            <Terminal className="w-4 h-4" />
          </button>
          
          <button className="p-1.5 hover:bg-[#344256] rounded text-white transition cursor-pointer relative" title="Notifications">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-[#ff9900] rounded-full"></span>
          </button>

          <button className="p-1.5 hover:bg-[#344256] rounded text-white transition cursor-pointer" title="Settings">
            <Settings className="w-4 h-4" />
          </button>

          <button className="p-1.5 hover:bg-[#344256] rounded text-white transition cursor-pointer" title="Support Help">
            <HelpCircle className="w-4 h-4" />
          </button>

          <div className="h-4 w-[1px] bg-gray-600"></div>

          {/* Region Indicator */}
          <div className="hidden md:flex items-center space-x-1.5 text-xs text-gray-300 px-2 py-1 rounded hover:bg-[#344256] cursor-pointer">
            <Globe className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-semibold">Global</span>
            <ChevronDown className="w-3 h-3 text-gray-400" />
          </div>

          {/* Account Profile and Logout */}
          <div className="flex items-center space-x-2 bg-[#2a384a] hover:bg-[#344256] px-2.5 py-1.5 rounded text-xs font-semibold cursor-pointer select-none">
            <User className="w-3.5 h-3.5 text-aws-orange shrink-0" />
            <span className="max-w-[120px] truncate text-white">{user?.email || 'admin@example.com'}</span>
            <button
              onClick={() => logout()}
              className="text-gray-400 hover:text-white shrink-0 ml-1 cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. Main Sidebar & Content Structure */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <nav
          className={`bg-white border-r border-[#d5dbdb] flex flex-col justify-between shrink-0 transition-all duration-150 ${
            sidebarOpen ? 'w-[240px]' : 'w-0 overflow-hidden border-r-0'
          }`}
          id="aws-sidebar"
        >
          {/* Sidebar Navigation Options */}
          <div className="py-4">
            <div className="px-4 mb-4">
              <h2 className="text-xs font-bold text-aws-text-muted uppercase tracking-wider">AWS Route 53</h2>
            </div>

            <ul className="space-y-0.5">
              {navItems.map((item) => {
                const isActive = currentTab === item.name;
                const isComingSoon = ['Traffic Policies', 'Health Checks', 'Resolver', 'Profiles'].includes(item.name);
                
                return (
                  <li key={item.name}>
                    <button
                      onClick={() => onTabChange(item.name)}
                      className={`w-full text-left px-4 py-2.5 text-xs font-medium flex items-center justify-between transition ${
                        isActive
                          ? 'bg-[#e2f0fd] text-[#0073bb] border-l-4 border-[#0073bb] pl-3 font-semibold'
                          : 'text-[#16191f] hover:bg-[#f2f3f3] hover:text-aws-blue border-l-4 border-transparent'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        {item.icon}
                        <span>{item.name}</span>
                      </div>
                      {isComingSoon && (
                        <span className="text-[9px] bg-gray-100 text-gray-500 border border-gray-300 font-bold px-1 rounded scale-95 shrink-0">
                          Beta
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Sidebar Footer info */}
          <div className="p-4 border-t border-[#eaeded] text-[11px] text-aws-text-muted space-y-1">
            <p className="font-bold text-aws-text">Global Service</p>
            <p>Route 53 does not require region selection. Any zone additions are replicated within seconds globally.</p>
          </div>
        </nav>

        {/* Right Workspace Frame */}
        <main className="flex-1 overflow-y-auto bg-[#fafafa]">
          {children}
        </main>
      </div>
    </div>
  );
}

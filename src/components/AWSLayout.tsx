import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/api';
import { HostedZone, DnsRecord } from '../types';
import { 
  LayoutDashboard, 
  Server, 
  Activity, 
  GitFork, 
  Share2, 
  User as UserIcon, 
  Search, 
  Bell, 
  Settings, 
  HelpCircle, 
  LogOut, 
  ExternalLink,
  ChevronDown,
  Globe,
  Copy,
  Check,
  Shield,
  Info,
  X,
  Loader2
} from 'lucide-react';

interface AWSLayoutProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  onNavigateToZone?: (zoneId: number, initialRecordSearch?: string) => void;
  children: React.ReactNode;
}

export const AWSLayout: React.FC<AWSLayoutProps> = ({ 
  currentTab, 
  onTabChange, 
  onNavigateToZone, 
  children 
}) => {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [profileOpen, setProfileOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [regionOpen, setRegionOpen] = useState(false);
  const [copiedAccountId, setCopiedAccountId] = useState(false);

  // Global search bar states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{
    zones: HostedZone[];
    records: (DnsRecord & { zone_name: string })[];
  } | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle global search debounce query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await api.globalSearch.search(searchQuery);
        setSearchResults(res);
      } catch (err) {
        console.error('Global search error:', err);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const sidebarItems = [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'Hosted Zones', icon: Server },
    { name: 'Traffic Policies', icon: GitFork },
    { name: 'Health Checks', icon: Activity },
    { name: 'Resolver', icon: Share2 },
    { name: 'Profiles', icon: UserIcon },
  ];

  const handleSignOut = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Error logging out:', err);
    }
  };

  const handleCopyAccountId = () => {
    navigator.clipboard.writeText('4725-1425-7619');
    setCopiedAccountId(true);
    setTimeout(() => setCopiedAccountId(false), 2000);
  };

  return (
    <div className="h-screen flex flex-col bg-aws-light text-aws-text overflow-hidden font-sans relative">
      
      {/* Invisible backdrop to dismiss any open dropdown on click-away */}
      {(profileOpen || supportOpen || regionOpen) && (
        <div 
          className="fixed inset-0 z-30 bg-transparent cursor-default" 
          onClick={() => {
            setProfileOpen(false);
            setSupportOpen(false);
            setRegionOpen(false);
          }}
        />
      )}

      {/* 1. AWS TOP NAVIGATION BAR */}
      <header className="bg-aws-navy h-12 shrink-0 flex items-center justify-between px-4 text-white z-40 select-none shadow-sm">
        
        {/* Left Section: Logo & Service Search */}
        <div className="flex items-center space-x-4 flex-1 max-w-xl">
          
          {/* AWS Symbol Orange Block */}
          <button 
            onClick={() => onTabChange('Dashboard')}
            className="flex items-center space-x-2 text-left cursor-pointer focus:outline-none"
          >
            <div className="bg-aws-orange text-white px-2 py-1 rounded text-xs font-black select-none tracking-tight">
              aws
            </div>
            <span className="text-xs font-semibold text-gray-200 hidden md:inline hover:text-white transition">
              Console
            </span>
          </button>

          <span className="text-gray-500 hidden sm:inline text-sm">|</span>

          {/* Service Logo & Search bar */}
          <div className="flex items-center space-x-2 flex-grow">
            <span 
              onClick={() => onTabChange('Dashboard')}
              className="text-sm font-semibold tracking-wide text-white hover:text-aws-orange cursor-pointer transition mr-2"
            >
              Route 53
            </span>

            {/* Global Search bar */}
            <div ref={searchContainerRef} className="relative flex-grow max-w-sm hidden md:block">
              <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-gray-400">
                {searchLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-aws-orange" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                placeholder="Search zones or DNS records globally..."
                className="w-full pl-8 pr-8 py-1 bg-slate-800/80 border border-slate-700 text-xs rounded text-gray-100 placeholder-gray-400 focus:outline-none focus:bg-slate-900 focus:border-aws-orange transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-gray-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}

              {/* Search Dropdown Results */}
              {searchFocused && searchQuery.trim() && (
                <div className="absolute left-0 right-0 mt-1.5 max-h-96 overflow-y-auto bg-slate-900 text-gray-200 border border-slate-700 shadow-2xl rounded py-2 z-50 text-xs select-none">
                  {searchLoading && !searchResults && (
                    <div className="px-4 py-3 text-center text-gray-400">
                      Searching records...
                    </div>
                  )}

                  {searchResults && (
                    <>
                      {/* Hosted Zones Section */}
                      <div>
                        <div className="px-3 py-1 text-[10px] uppercase font-bold text-gray-400 tracking-wider bg-slate-950/40">
                          Hosted Zones ({searchResults.zones.length})
                        </div>
                        {searchResults.zones.length === 0 ? (
                          <div className="px-4 py-2 text-[10px] text-gray-500 italic">No zones found</div>
                        ) : (
                          searchResults.zones.map((zone) => (
                            <button
                              key={zone.id}
                              onClick={() => {
                                if (onNavigateToZone) {
                                  onNavigateToZone(zone.id);
                                }
                                setSearchQuery('');
                                setSearchFocused(false);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-slate-800 flex items-center justify-between transition border-b border-slate-800/40 cursor-pointer"
                            >
                              <div>
                                <div className="font-semibold text-white">{zone.name}</div>
                                <div className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[220px]">
                                  {zone.comment || 'No comment'}
                                </div>
                              </div>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                zone.type === 'Public' ? 'bg-green-950/80 text-green-400 border border-green-950' : 'bg-blue-950/80 text-blue-400 border border-blue-950'
                              }`}>
                                {zone.type}
                              </span>
                            </button>
                          ))
                        )}
                      </div>

                      {/* DNS Records Section */}
                      <div className="mt-2">
                        <div className="px-3 py-1 text-[10px] uppercase font-bold text-gray-400 tracking-wider bg-slate-950/40">
                          DNS Records ({searchResults.records.length})
                        </div>
                        {searchResults.records.length === 0 ? (
                          <div className="px-4 py-2 text-[10px] text-gray-500 italic">No records found</div>
                        ) : (
                          searchResults.records.map((record) => (
                            <button
                              key={record.id}
                              onClick={() => {
                                if (onNavigateToZone) {
                                  onNavigateToZone(record.hosted_zone_id, record.name);
                                }
                                setSearchQuery('');
                                setSearchFocused(false);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-slate-800 transition border-b border-slate-800/40 cursor-pointer"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-white truncate max-w-[180px]">{record.name}</span>
                                <span className="px-1 bg-slate-800 text-[9px] font-mono font-bold text-aws-orange border border-slate-700 rounded shrink-0">
                                  {record.type}
                                </span>
                              </div>
                              <div className="text-[10px] text-gray-400 font-mono mt-0.5 truncate max-w-[300px]">
                                {record.value}
                              </div>
                              <div className="text-[9px] text-slate-500 mt-0.5 font-sans">
                                Zone: {record.zone_name}
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </>
                  )}

                  {searchResults && searchResults.zones.length === 0 && searchResults.records.length === 0 && (
                    <div className="px-4 py-3 text-center text-gray-400 font-medium">
                      No matching records or zones found.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Section: Account ID, Region dropdown, Profile, Logouts */}
        <div className="flex items-center space-x-3.5">
          
          {/* Support Dropdown */}
          <div className="relative">
            <button
              id="top_support_dropdown"
              onClick={() => {
                setSupportOpen(!supportOpen);
                setRegionOpen(false);
                setProfileOpen(false);
              }}
              className={`flex items-center space-x-1.5 py-1 px-2.5 rounded text-xs font-medium cursor-pointer transition focus:outline-none ${
                supportOpen ? 'bg-slate-800 text-white' : 'text-gray-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5 text-gray-400" />
              <span className="hidden sm:inline">Support</span>
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </button>

            {supportOpen && (
              <div className="absolute right-0 mt-1.5 w-64 bg-slate-900 text-gray-200 border border-slate-700 shadow-xl py-2 z-50 rounded select-none text-xs animate-in fade-in duration-100">
                <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between">
                  <span className="font-bold text-gray-100 text-[11px] uppercase tracking-wider">Support & Resources</span>
                  <HelpCircle className="w-3.5 h-3.5 text-aws-orange" />
                </div>
                
                <div className="py-1">
                  <a 
                    href="https://aws.amazon.com/premiumsupport/" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="flex flex-col px-4 py-2 hover:bg-slate-800 transition"
                  >
                    <span className="font-semibold text-white flex items-center space-x-1">
                      <span>Support Center</span>
                      <ExternalLink className="w-2.5 h-2.5 text-gray-400" />
                    </span>
                    <span className="text-[10px] text-gray-400 mt-0.5">Submit support tickets and monitor cases.</span>
                  </a>

                  <a 
                    href="https://docs.aws.amazon.com/route53/" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="flex flex-col px-4 py-2 hover:bg-slate-800 transition"
                  >
                    <span className="font-semibold text-white flex items-center space-x-1">
                      <span>Route 53 Documentation</span>
                      <ExternalLink className="w-2.5 h-2.5 text-gray-400" />
                    </span>
                    <span className="text-[10px] text-gray-400 mt-0.5">DNS design patterns, Resolver guides, and API specs.</span>
                  </a>

                  <a 
                    href="https://repost.aws/tags/TA7P84q4rXQp2S67Xv4wH-9w/amazon-route-53" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="flex flex-col px-4 py-2 hover:bg-slate-800 transition"
                  >
                    <span className="font-semibold text-white flex items-center space-x-1">
                      <span>AWS re:Post (Forums)</span>
                      <ExternalLink className="w-2.5 h-2.5 text-gray-400" />
                    </span>
                    <span className="text-[10px] text-gray-400 mt-0.5">Ask questions and search community answers.</span>
                  </a>
                </div>

                <div className="border-t border-slate-800 my-1" />

                <div className="px-4 py-2 bg-slate-950/40 text-[10px] space-y-1.5">
                  <div className="font-semibold text-gray-400 uppercase tracking-wider">Service Health Status</div>
                  <div className="flex items-center space-x-1.5 text-green-400 font-medium">
                    <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse shrink-0" />
                    <span>Route 53 (Global) - Operating Normally</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Region Label: Global (Route53 is global DNS) */}
          <div className="relative">
            <button
              id="top_region_dropdown"
              onClick={() => {
                setRegionOpen(!regionOpen);
                setSupportOpen(false);
                setProfileOpen(false);
              }}
              className={`flex items-center space-x-1.5 py-1 px-2.5 rounded text-xs font-medium cursor-pointer transition focus:outline-none ${
                regionOpen ? 'bg-slate-800 text-white' : 'bg-slate-800 border border-slate-700 text-gray-300 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-aws-orange shrink-0" />
              <span>Global</span>
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </button>

            {regionOpen && (
              <div className="absolute right-0 mt-1.5 w-72 bg-slate-900 text-gray-200 border border-slate-700 shadow-xl p-3.5 z-50 rounded select-none text-xs animate-in fade-in duration-100">
                <div className="flex items-start space-x-2 bg-slate-950/60 p-2.5 rounded border border-slate-800 mb-3 text-gray-300 leading-normal text-[10.5px]">
                  <Info className="w-4 h-4 text-aws-orange shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white">Route 53 is a Global DNS Service</span>
                    <p className="mt-0.5 text-gray-400 text-[10px]">
                      Route 53 uses a global network of DNS servers to resolve domain names with high performance. Hosted zones and routing records are automatically replicated globally across all 450+ edge locations.
                    </p>
                  </div>
                </div>

                <div className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-1.5">
                  Regional Resources (Read-Only)
                </div>
                <div className="space-y-1 text-[11px] text-gray-500 font-mono">
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span>US East (N. Virginia)</span>
                    <span className="text-[10px]">us-east-1</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span>US West (Oregon)</span>
                    <span className="text-[10px]">us-west-2</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span>EU (Ireland)</span>
                    <span className="text-[10px]">eu-west-1</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>Asia Pacific (Tokyo)</span>
                    <span className="text-[10px]">ap-northeast-1</span>
                  </div>
                </div>

                <div className="text-[10px] text-gray-400 mt-3 border-t border-slate-800 pt-2 text-center">
                  Region selection is handled automatically by latency-based and geolocation routing policies.
                </div>
              </div>
            )}
          </div>

          {/* Alert Notification mock */}
          <button className="text-gray-400 hover:text-white relative shrink-0 p-1.5 rounded hover:bg-slate-800">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 block h-1.5 w-1.5 rounded-full bg-aws-orange animate-pulse" />
          </button>

          {/* User Profile dropdown */}
          <div className="relative">
            <button 
              id="top_profile_dropdown"
              onClick={() => {
                setProfileOpen(!profileOpen);
                setSupportOpen(false);
                setRegionOpen(false);
              }}
              className={`flex items-center space-x-1.5 py-1 px-2.5 rounded text-xs font-medium cursor-pointer transition focus:outline-none ${
                profileOpen ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 text-gray-300 hover:text-white'
              }`}
            >
              <UserIcon className="w-3.5 h-3.5 text-gray-400" />
              <span className="max-w-[120px] truncate hidden md:inline">{user?.email || 'admin@example.com'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-1.5 w-64 bg-slate-900 text-gray-200 border border-slate-700 shadow-xl py-2 z-50 rounded select-none text-xs animate-in fade-in duration-100">
                
                {/* ID & User Header */}
                <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/50">
                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">IAM Username</div>
                  <div className="text-xs font-semibold text-white truncate mt-0.5">{user?.email || 'admin@example.com'}</div>
                  
                  <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Account ID</div>
                      <div className="text-xs font-mono font-medium text-slate-200 mt-0.5">4725-1425-7619</div>
                    </div>
                    <button
                      onClick={handleCopyAccountId}
                      className="p-1 px-2 bg-slate-800 hover:bg-slate-700 rounded text-gray-300 hover:text-white transition focus:outline-none flex items-center space-x-1"
                      title="Copy Account ID"
                    >
                      {copiedAccountId ? (
                        <>
                          <Check className="w-3 h-3 text-green-400" />
                          <span className="text-[10px] text-green-400 font-semibold">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-2.5 h-2.5" />
                          <span className="text-[10px]">Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="mt-2 text-[10px] flex items-center space-x-1 text-aws-orange font-medium">
                    <Shield className="w-3.5 h-3.5" />
                    <span>IAM Role: AdministratorAccess</span>
                  </div>
                </div>

                {/* Navigation / Links */}
                <div className="py-1">
                  <a 
                    href="#" 
                    onClick={(e) => e.preventDefault()} 
                    className="flex items-center justify-between px-4 py-2 hover:bg-slate-800 text-xs text-gray-200 hover:text-white transition"
                  >
                    <span>My Account</span>
                    <ExternalLink className="w-3 h-3 text-gray-500" />
                  </a>
                  <a 
                    href="#" 
                    onClick={(e) => e.preventDefault()} 
                    className="flex items-center justify-between px-4 py-2 hover:bg-slate-800 text-xs text-gray-200 hover:text-white transition"
                  >
                    <span>My Security Credentials</span>
                    <ExternalLink className="w-3 h-3 text-gray-500" />
                  </a>
                  <a 
                    href="#" 
                    onClick={(e) => e.preventDefault()} 
                    className="flex items-center justify-between px-4 py-2 hover:bg-slate-800 text-xs text-gray-200 hover:text-white transition"
                  >
                    <span>Billing Dashboard</span>
                    <ExternalLink className="w-3 h-3 text-gray-500" />
                  </a>
                  <a 
                    href="#" 
                    onClick={(e) => e.preventDefault()} 
                    className="flex items-center justify-between px-4 py-2 hover:bg-slate-800 text-xs text-gray-200 hover:text-white transition"
                  >
                    <span>Service Quotas (Route 53)</span>
                    <ExternalLink className="w-3 h-3 text-gray-500" />
                  </a>
                </div>

                <div className="border-t border-slate-800 my-1" />

                {/* Sign Out Button */}
                <div className="px-2 py-1">
                  <button
                    id="top_signout_btn"
                    onClick={handleSignOut}
                    className="w-full text-left px-3 py-1.5 hover:bg-red-950/40 rounded text-xs text-red-400 hover:text-red-300 font-semibold flex items-center space-x-2 transition cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

      </header>

      {/* 2. MAIN BODY (SIDEBAR + MAIN FRAME CONTENT) */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Sidebar Navigation */}
        <aside className="w-56 bg-white border-r border-[#b8c2cc] shrink-0 select-none hidden md:flex flex-col justify-between">
          
          <div className="py-4 space-y-4">
            
            {/* Header / Brand title */}
            <div className="px-4 border-b border-aws-border pb-3">
              <span className="text-xs font-bold text-aws-text uppercase tracking-wider">
                Route 53 Console
              </span>
            </div>

            {/* Sidebar list items */}
            <nav className="space-y-0.5">
              {sidebarItems.map((item) => {
                const isActive = currentTab === item.name;
                const Icon = item.icon;
                return (
                  <button
                    key={item.name}
                    id={`sidebar_tab_${item.name.toLowerCase().replace(/ /g, '_')}`}
                    onClick={() => onTabChange(item.name)}
                    className={`w-full flex items-center space-x-3 py-2 px-4 text-xs font-medium border-l-4 transition ${
                      isActive
                        ? 'border-aws-orange bg-slate-50 text-aws-text'
                        : 'border-transparent text-aws-text-muted hover:bg-slate-50 hover:text-aws-text'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-aws-orange' : 'text-aws-text-muted'}`} />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </nav>

          </div>

          {/* Bottom Sidebar details / Credit lines */}
          <div className="p-4 border-t border-aws-border bg-slate-50 space-y-1.5">
            <div className="text-[10px] text-aws-text-muted font-bold uppercase tracking-wider">
              DNS Authority Status
            </div>
            <div className="flex items-center space-x-1.5 text-[10px] text-green-700">
              <span className="animate-ping h-2 w-2 rounded-full bg-green-500 shrink-0" />
              <span>Full Sandbox Live</span>
            </div>
          </div>

        </aside>

        {/* Master Content Frame Area */}
        <main className="flex-1 overflow-y-auto bg-aws-light relative">
          
          {/* Mobile responsive sidebar tab ribbon */}
          <div className="md:hidden bg-white border-b border-aws-border p-2.5 flex items-center justify-between shadow-sm">
            <span className="text-xs font-bold text-aws-text">Route 53: <span className="text-aws-orange">{currentTab}</span></span>
            <div className="flex space-x-1.5">
              {sidebarItems.map((item) => (
                <button
                  key={item.name}
                  onClick={() => onTabChange(item.name)}
                  className={`p-1 border rounded text-[10px] font-bold ${
                    currentTab === item.name 
                      ? 'bg-aws-orange text-white border-aws-orange' 
                      : 'bg-white text-aws-text border-gray-300'
                  }`}
                >
                  {item.name.substring(0, 3)}
                </button>
              ))}
            </div>
          </div>

          {/* View component */}
          {children}

        </main>

      </div>

    </div>
  );
};

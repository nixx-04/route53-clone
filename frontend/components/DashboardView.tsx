import React from 'react';
import { 
  Server, 
  Activity, 
  GitFork, 
  Share2, 
  Globe, 
  ArrowRight, 
  ShieldCheck, 
  CheckCircle,
  HelpCircle
} from 'lucide-react';

interface DashboardViewProps {
  hostedZonesCount: number;
  onNavigate: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ hostedZonesCount, onNavigate }) => {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-aws-border pb-4">
        <div>
          <h1 className="text-2xl font-semibold text-aws-text">Route 53 Dashboard</h1>
          <p className="text-xs text-aws-text-muted mt-1">
            Amazon Route 53 is a highly available and scalable Domain Name System (DNS) web service.
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex space-x-3">
          <button 
            id="dash_create_hz_btn"
            onClick={() => onNavigate('Hosted Zones')}
            className="px-4 py-2 bg-aws-orange hover:bg-aws-orange-hover text-white rounded text-xs font-semibold shadow-sm transition"
          >
            Create hosted zone
          </button>
          <button 
            onClick={() => onNavigate('Profiles')}
            className="px-4 py-2 bg-white hover:bg-slate-50 text-aws-text border border-[#b8c2cc] rounded text-xs font-semibold transition"
          >
            Register domain
          </button>
        </div>
      </div>

      {/* Main Grid: Info Banner & Resources Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: DNS/Traffic Widgets */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Welcome Dashboard Banner */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded p-6 shadow-sm relative overflow-hidden">
            <div className="relative z-10 max-w-lg">
              <h2 className="text-lg font-bold text-aws-orange">DNS and Traffic Management Simplified</h2>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Connect user requests to infrastructure running in AWS (such as Amazon EC2 instances, Elastic Load Balancing load balancers, or Amazon S3 buckets), or route traffic to external servers outside of AWS.
              </p>
              <div className="mt-4 flex space-x-4">
                <button 
                  onClick={() => onNavigate('Hosted Zones')}
                  className="px-3.5 py-1.5 bg-aws-orange hover:bg-aws-orange-hover text-white font-medium rounded text-xs transition flex items-center space-x-1"
                >
                  <span>Manage Hosted Zones</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
                <button 
                  onClick={() => onNavigate('Health Checks')}
                  className="px-3.5 py-1.5 bg-transparent border border-slate-500 hover:border-white text-slate-200 hover:text-white rounded text-xs transition"
                >
                  Learn DNS Routing
                </button>
              </div>
            </div>
            {/* Decors */}
            <div className="absolute right-0 bottom-0 opacity-10 transform translate-y-4 translate-x-4">
              <Globe className="w-64 h-64 text-white" />
            </div>
          </div>

          {/* DNS Management Hub (AWS Cards style) */}
          <div className="bg-white border border-aws-border rounded shadow-sm">
            <div className="p-4 border-b border-aws-border bg-slate-50 flex justify-between items-center">
              <h3 className="text-sm font-semibold text-aws-text">DNS Management</h3>
              <HelpCircle className="w-4 h-4 text-aws-text-muted cursor-pointer" />
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-aws-text uppercase tracking-wider">Hosted zones</h4>
                <p className="text-xs text-aws-text-muted">
                  A hosted zone is a container for records, and records contain information about how you want to route traffic for a specific domain.
                </p>
                <div className="pt-2 flex items-baseline space-x-2">
                  <span className="text-3xl font-black text-aws-text">{hostedZonesCount}</span>
                  <span className="text-xs text-aws-text-muted">active zone(s)</span>
                </div>
                <button 
                  onClick={() => onNavigate('Hosted Zones')}
                  className="text-xs font-semibold text-aws-blue hover:underline flex items-center space-x-0.5 pt-2"
                >
                  <span>Go to Hosted Zones</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              <div className="space-y-2 border-t md:border-t-0 md:border-l border-aws-border pt-4 md:pt-0 md:pl-6">
                <h4 className="text-xs font-bold text-aws-text uppercase tracking-wider">Health Checks</h4>
                <p className="text-xs text-aws-text-muted">
                  Route 53 health checks monitor the health and performance of your web applications, servers, and other resources.
                </p>
                <div className="pt-2 flex items-baseline space-x-2">
                  <span className="text-3xl font-black text-aws-text-muted">0</span>
                  <span className="text-xs text-aws-text-muted">monitored endpoints</span>
                </div>
                <button 
                  onClick={() => onNavigate('Health Checks')}
                  className="text-xs font-semibold text-aws-blue hover:underline flex items-center space-x-0.5 pt-2"
                >
                  <span>Create Health Check</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

            </div>
          </div>

          {/* Traffic flow, resolver, coming soon grids */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="bg-white border border-aws-border p-4 rounded shadow-sm flex flex-col justify-between">
              <div>
                <div className="text-aws-blue mb-2">
                  <GitFork className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-semibold text-aws-text">Traffic policies</h4>
                <p className="text-[11px] text-aws-text-muted mt-1">
                  Define complex routing configurations using geo, weighted, or failover logic.
                </p>
              </div>
              <button 
                onClick={() => onNavigate('Traffic Policies')}
                className="text-xs text-aws-blue hover:underline font-semibold mt-3 flex items-center space-x-0.5"
              >
                <span>Manage policies</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="bg-white border border-aws-border p-4 rounded shadow-sm flex flex-col justify-between">
              <div>
                <div className="text-aws-blue mb-2">
                  <Share2 className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-semibold text-aws-text">Resolver rules</h4>
                <p className="text-[11px] text-aws-text-muted mt-1">
                  Query DNS names across VPCs and your on-premises networks recursively.
                </p>
              </div>
              <button 
                onClick={() => onNavigate('Resolver')}
                className="text-xs text-aws-blue hover:underline font-semibold mt-3 flex items-center space-x-0.5"
              >
                <span>Configure resolver</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="bg-white border border-aws-border p-4 rounded shadow-sm flex flex-col justify-between">
              <div>
                <div className="text-aws-blue mb-2">
                  <Globe className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-semibold text-aws-text">Registered domains</h4>
                <p className="text-[11px] text-aws-text-muted mt-1">
                  Register, transfer, and manage your domain names directly inside Route 53.
                </p>
              </div>
              <button 
                onClick={() => onNavigate('Profiles')}
                className="text-xs text-aws-blue hover:underline font-semibold mt-3 flex items-center space-x-0.5"
              >
                <span>Register domains</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

          </div>

        </div>

        {/* Right 1 Column: AWS Panel / Health Check details */}
        <div className="space-y-6">
          
          {/* Quick links panel */}
          <div className="bg-white border border-aws-border rounded shadow-sm p-4">
            <h3 className="text-xs font-bold text-aws-text uppercase tracking-wider border-b border-aws-border pb-2 mb-3">
              Route 53 Pricing & Reference
            </h3>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#" className="text-aws-blue hover:underline flex items-center justify-between">
                  <span>Standard DNS queries</span>
                  <span className="text-aws-text-muted">$0.40 per million</span>
                </a>
              </li>
              <li>
                <a href="#" className="text-aws-blue hover:underline flex items-center justify-between">
                  <span>Public Hosted Zone</span>
                  <span className="text-aws-text-muted">$0.50 per month</span>
                </a>
              </li>
              <li>
                <a href="#" className="text-aws-blue hover:underline flex items-center justify-between">
                  <span>Private Hosted Zone</span>
                  <span className="text-aws-text-muted">$0.50 per month</span>
                </a>
              </li>
              <li>
                <a href="#" className="text-aws-blue hover:underline flex items-center justify-between">
                  <span>Health check (AWS endpoints)</span>
                  <span className="text-aws-text-muted">Free</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Service Health Monitor Mock */}
          <div className="bg-white border border-aws-border rounded shadow-sm p-4">
            <div className="flex items-center space-x-2 text-green-700 mb-3">
              <CheckCircle className="w-5 h-5" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-aws-text">Service Status</h3>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between text-[11px] border-b border-aws-border pb-1.5">
                <span className="text-aws-text-muted">Route 53 DNS Service</span>
                <span className="font-semibold text-green-600">Operating normally</span>
              </div>
              <div className="flex items-center justify-between text-[11px] border-b border-aws-border pb-1.5">
                <span className="text-aws-text-muted">Route 53 Global Console</span>
                <span className="font-semibold text-green-600">Operating normally</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-aws-text-muted">Health Check Probers</span>
                <span className="font-semibold text-green-600">Operating normally</span>
              </div>
            </div>
          </div>

          {/* Security Compliance Panel */}
          <div className="bg-amber-50 border border-amber-200 rounded p-4 text-xs space-y-2">
            <div className="flex items-center space-x-1.5 text-amber-800 font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>Sandbox Account Shield</span>
            </div>
            <p className="text-amber-700 leading-relaxed text-[11px]">
              You are signed in with simulation administrative privileges. All records and zones created will reside securely in the sandboxed local SQLite instance.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
};

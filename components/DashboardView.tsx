'use client';

import React, { useEffect, useState } from 'react';
import { Globe, Server, Activity, ShieldCheck, ArrowRight, BookOpen, ExternalLink, RefreshCw } from 'lucide-react';

interface DashboardViewProps {
  hostedZonesCount: number;
  onNavigate: (tab: string) => void;
}

export function DashboardView({ hostedZonesCount, onNavigate }: DashboardViewProps) {
  const [localZonesCount, setLocalZonesCount] = useState(hostedZonesCount);
  const [loading, setLoading] = useState(false);

  // Fetch count on mount to ensure we are synced with backend
  const fetchCount = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hosted-zones?limit=1');
      if (res.ok) {
        const data = await res.json();
        setLocalZonesCount(data.pagination.total);
      }
    } catch (err) {
      console.error('Error fetching dashboard zone count:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCount();
  }, []);

  return (
    <div className="p-6 md:p-8 font-sans" id="aws-dashboard-view">
      {/* 1. Page Header */}
      <div className="border-b border-[#eaeded] pb-4 mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-aws-text">Route 53 Dashboard</h1>
          <p className="text-sm text-aws-text-muted mt-1">
            Amazon Route 53 is a highly available and scalable Domain Name System (DNS) web service.
          </p>
        </div>
        <button
          onClick={fetchCount}
          disabled={loading}
          className="p-2 border border-[#d5dbdb] rounded bg-white hover:bg-[#fafafa] text-aws-text transition text-xs flex items-center space-x-1.5 shadow-sm cursor-pointer"
          title="Refresh stats"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-aws-text-muted ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* 2. Welcome Banner Hero */}
      <div className="bg-[#161b22] text-white p-6 rounded border border-gray-800 shadow-sm mb-8 flex flex-col md:flex-row items-start md:items-center justify-between">
        <div className="space-y-2 max-w-2xl">
          <div className="bg-[#ff9900] text-[#16191f] text-[10px] font-bold px-2 py-0.5 rounded w-max">
            GLOBAL CORE SERVICE
          </div>
          <h2 className="text-xl font-bold">AWS Route53 Global DNS Consolidation</h2>
          <p className="text-xs text-gray-300 leading-relaxed">
            Manage public or private domain databases, set low-latency health checkpoints, configure robust weighted route trees, and ensure your services remain accessible worldwide with 100% SLA availability.
          </p>
        </div>
        <button
          onClick={() => onNavigate('Hosted Zones')}
          className="mt-4 md:mt-0 bg-[#ff9900] hover:bg-[#ec7211] text-[#16191f] font-bold text-xs py-2 px-4 rounded shadow transition shrink-0 flex items-center space-x-1 cursor-pointer"
        >
          <span>Get Started: Create Hosted Zone</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 3. Operational Grid - Metrics and Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Card 1: DNS Management (Active) */}
        <div className="bg-white border border-[#d5dbdb] rounded shadow-sm hover:border-[#b8c2cc] transition flex flex-col justify-between p-5">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-aws-text-muted uppercase">DNS Management</span>
              <Globe className="w-5 h-5 text-[#0073bb]" />
            </div>
            <p className="text-2xl font-bold text-aws-text">
              {loading ? '...' : localZonesCount}
            </p>
            <p className="text-xs text-aws-text-muted mt-1 leading-relaxed">
              Hosted zones containing public or private DNS records (A, CNAME, TXT, MX, SOA, NS).
            </p>
          </div>
          <button
            onClick={() => onNavigate('Hosted Zones')}
            className="mt-4 text-xs font-bold text-[#0073bb] hover:text-aws-blue-hover flex items-center space-x-1 hover:underline text-left cursor-pointer"
          >
            <span>Manage Hosted Zones</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card 2: Traffic Steering (Simulated) */}
        <div className="bg-white border border-[#d5dbdb] rounded shadow-sm hover:border-[#b8c2cc] transition flex flex-col justify-between p-5">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-aws-text-muted uppercase">Traffic Policies</span>
              <Server className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-aws-text">0</p>
            <p className="text-xs text-aws-text-muted mt-1 leading-relaxed">
              Geolocational, failover, latency, and multi-value load balancing steering rules.
            </p>
          </div>
          <button
            onClick={() => onNavigate('Traffic Policies')}
            className="mt-4 text-xs font-bold text-purple-600 hover:text-purple-800 flex items-center space-x-1 hover:underline text-left cursor-pointer"
          >
            <span>Configure Steering</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card 3: Availability Monitoring (Simulated) */}
        <div className="bg-white border border-[#d5dbdb] rounded shadow-sm hover:border-[#b8c2cc] transition flex flex-col justify-between p-5">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-aws-text-muted uppercase">Health Checks</span>
              <Activity className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-emerald-600 font-mono">ACTIVE</p>
            <p className="text-xs text-aws-text-muted mt-1 leading-relaxed">
              Real-time server probe status and DNS query automatic failover configurations.
            </p>
          </div>
          <button
            onClick={() => onNavigate('Health Checks')}
            className="mt-4 text-xs font-bold text-emerald-600 hover:text-emerald-800 flex items-center space-x-1 hover:underline text-left cursor-pointer"
          >
            <span>Monitor Health</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card 4: Domain Registrations (Simulated) */}
        <div className="bg-white border border-[#d5dbdb] rounded shadow-sm hover:border-[#b8c2cc] transition flex flex-col justify-between p-5">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-aws-text-muted uppercase">Domains</span>
              <ShieldCheck className="w-5 h-5 text-[#ff9900]" />
            </div>
            <p className="text-2xl font-bold text-aws-text">0</p>
            <p className="text-xs text-aws-text-muted mt-1 leading-relaxed">
              Domain purchase, auto-renewals, and DNSSEC safety profiles for registered TLDs.
            </p>
          </div>
          <button
            onClick={() => onNavigate('Profiles')}
            className="mt-4 text-xs font-bold text-aws-orange hover:text-aws-orange-hover flex items-center space-x-1 hover:underline text-left cursor-pointer"
          >
            <span>Register Domain</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 4. Secondary Information Panels (FAQs, AWS documentation links) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Help & Learning */}
        <div className="lg:col-span-2 bg-white border border-[#d5dbdb] rounded p-6 shadow-sm">
          <h3 className="text-sm font-bold text-aws-text uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
            DNS & ROUTE 53 KNOWLEDGE CENTER
          </h3>

          <div className="space-y-5">
            <div className="flex items-start space-x-3">
              <BookOpen className="w-4 h-4 text-[#0073bb] shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-aws-text">What is a Hosted Zone?</h4>
                <p className="text-xs text-aws-text-muted mt-1 leading-relaxed">
                  A hosted zone is a container for records, which include information about how you want to route traffic for a domain (such as example.com) and all of its subdomains (such as dev.example.com or mail.example.com).
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <BookOpen className="w-4 h-4 text-[#0073bb] shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-aws-text">Public vs. Private Hosted Zones</h4>
                <p className="text-xs text-aws-text-muted mt-1 leading-relaxed">
                  A <strong>Public Hosted Zone</strong> determines how internet traffic is routed to your domain. A <strong>Private Hosted Zone</strong> determines how traffic is routed within one or more Amazon Virtual Private Clouds (VPC) without exposing IPs to the outer web.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <BookOpen className="w-4 h-4 text-[#0073bb] shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-aws-text">Common DNS Record Types</h4>
                <p className="text-xs text-aws-text-muted mt-1 leading-relaxed font-sans">
                  Use <strong>A Records</strong> to map hostnames directly to IPv4 addresses. Use <strong>CNAME Records</strong> to map hostnames to other canonical hostnames. Use <strong>TXT Records</strong> for domain owner proof, SPF verification, or secure DKIM keys.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* AWS Useful Links */}
        <div className="bg-white border border-[#d5dbdb] rounded p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-aws-text uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
              EXTERNAL AWS RESOURCES
            </h3>

            <ul className="space-y-3.5 text-xs">
              <li>
                <a href="https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/Welcome.html" target="_blank" rel="noopener noreferrer" className="text-[#0073bb] hover:underline flex items-center justify-between">
                  <span>Route 53 Developer Guide</span>
                  <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                </a>
              </li>
              <li>
                <a href="https://aws.amazon.com/route53/pricing/" target="_blank" rel="noopener noreferrer" className="text-[#0073bb] hover:underline flex items-center justify-between">
                  <span>Route 53 Service Pricing</span>
                  <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                </a>
              </li>
              <li>
                <a href="https://aws.amazon.com/route53/faqs/" target="_blank" rel="noopener noreferrer" className="text-[#0073bb] hover:underline flex items-center justify-between">
                  <span>Amazon Route 53 FAQs</span>
                  <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                </a>
              </li>
              <li>
                <a href="https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-routing-policy.html" target="_blank" rel="noopener noreferrer" className="text-[#0073bb] hover:underline flex items-center justify-between">
                  <span>Configuring DNS Routing Policies</span>
                  <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                </a>
              </li>
            </ul>
          </div>

          <div className="mt-6 bg-[#f2f3f3] p-3 rounded text-[11px] text-aws-text-muted border border-[#d5dbdb]">
            <p className="font-bold text-[#16191f] mb-1">Developer Sandbox Info</p>
            <p>Any record created in this dashboard is live instantly in your simulated zone database. You can search or trace resolving paths using the search bar at the top of the screen.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

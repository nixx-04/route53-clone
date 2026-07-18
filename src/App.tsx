import { useEffect, useState } from 'react';
import { useAuthStore } from './store/authStore';
import { AWSLogin } from './components/AWSLogin';
import { AWSLayout } from './components/AWSLayout';
import { DashboardView } from './components/DashboardView';
import { HostedZonesView } from './components/HostedZonesView';
import { HostedZoneDetailView } from './components/HostedZoneDetailView';
import { ComingSoonView } from './components/ComingSoonView';
import { Loader2 } from 'lucide-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a query client for TanStack Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function App() {
  const { isAuthenticated, loading, checkSession } = useAuthStore();
  const [currentTab, setCurrentTab] = useState('Dashboard');
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
  const [hostedZonesCount, setHostedZonesCount] = useState(0);
  const [initialRecordSearch, setInitialRecordSearch] = useState('');

  // Check auth session on application startup
  useEffect(() => {
    checkSession();
  }, []);

  // Update dynamic count of hosted zones for the dashboard widget
  const handleUpdateCount = (count: number) => {
    setHostedZonesCount(count);
  };

  // Loader block for initial checking
  if (loading && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#eaeded] flex flex-col items-center justify-center font-sans text-aws-text">
        <div className="bg-white border border-[#b8c2cc] p-8 rounded shadow-sm text-center flex flex-col items-center space-y-4 max-w-sm">
          <Loader2 className="w-10 h-10 text-aws-orange animate-spin" />
          <div>
            <h3 className="text-sm font-bold">AWS Route53 Global Console</h3>
            <p className="text-xs text-aws-text-muted mt-1">
              Verifying security tokens and retrieving route databases. Please wait...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Not logged in -> Render the IAM Sign In panel
  if (!isAuthenticated) {
    return <AWSLogin />;
  }

  // Logged in -> Render full AWS Management Frame
  const renderMainContent = () => {
    if (currentTab === 'Dashboard') {
      return (
        <DashboardView 
          hostedZonesCount={hostedZonesCount} 
          onNavigate={(tab) => {
            setCurrentTab(tab);
            setSelectedZoneId(null);
          }}
        />
      );
    }

    if (currentTab === 'Hosted Zones') {
      if (selectedZoneId !== null) {
        return (
          <HostedZoneDetailView 
            zoneId={selectedZoneId} 
            onBack={() => {
              setSelectedZoneId(null);
              setInitialRecordSearch('');
            }} 
            initialSearch={initialRecordSearch}
            clearInitialSearch={() => setInitialRecordSearch('')}
          />
        );
      }
      return (
        <HostedZonesView 
          onSelectZone={(id) => setSelectedZoneId(id)} 
          onUpdateCount={handleUpdateCount}
        />
      );
    }

    if (currentTab === 'Traffic Policies') {
      return (
        <ComingSoonView 
          title="Traffic Policies" 
          description="Traffic policies let you use a visual editor to define complex DNS routing policies on the global scale, including geolocation routing, latency-based routing, failover, and multi-value answers. Save them as reusable policy documents and apply them directly to records." 
        />
      );
    }

    if (currentTab === 'Health Checks') {
      return (
        <ComingSoonView 
          title="Health Checks" 
          description="Configure Amazon Route 53 health checks to monitor the health of your web servers and other resources. When a resource becomes unavailable, Route 53 can automatically route queries to alternate resources using failover configurations." 
        />
      );
    }

    if (currentTab === 'Resolver') {
      return (
        <ComingSoonView 
          title="VPC DNS Resolver" 
          description="Route 53 Resolver provides recursive DNS query processing within Amazon VPC networks and establishes rule-based outbound/inbound endpoints to securely forward queries between your cloud VPC and your on-premises servers." 
        />
      );
    }

    if (currentTab === 'Profiles') {
      return (
        <ComingSoonView 
          title="Domain Profiles & Registrations" 
          description="Register or transfer top-level domain names (TLDs) such as .com, .org, or .net, and configure secure resource profiles to bind name servers and whois information automatically to your hosted zones." 
        />
      );
    }

    return (
      <div className="p-6">
        <h2 className="text-lg font-bold text-red-600">Error</h2>
        <p className="text-xs">Selected view tab "{currentTab}" is invalid or unreachable.</p>
      </div>
    );
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AWSLayout 
        currentTab={currentTab} 
        onTabChange={(tab) => {
          setCurrentTab(tab);
          // Reset nested detail sub-view if changing tabs
          setSelectedZoneId(null);
          setInitialRecordSearch('');
        }}
        onNavigateToZone={(zoneId, initialSearch) => {
          setCurrentTab('Hosted Zones');
          setSelectedZoneId(zoneId);
          if (initialSearch) {
            setInitialRecordSearch(initialSearch);
          } else {
            setInitialRecordSearch('');
          }
        }}
      >
        {renderMainContent()}
      </AWSLayout>
    </QueryClientProvider>
  );
}

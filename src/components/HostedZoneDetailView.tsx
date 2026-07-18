import React, { useState, useEffect } from 'react';
import { HostedZone, DnsRecord, RecordType } from '../types';
import { api } from '../lib/api';
import { 
  ArrowLeft, 
  Search, 
  Plus, 
  Trash2, 
  Edit, 
  Download, 
  Copy, 
  Check, 
  X, 
  Loader2, 
  AlertCircle,
  HelpCircle,
  Globe,
  Lock,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react';

interface HostedZoneDetailViewProps {
  zoneId: number;
  onBack: () => void;
  initialSearch?: string;
  clearInitialSearch?: () => void;
}

export const HostedZoneDetailView: React.FC<HostedZoneDetailViewProps> = ({ 
  zoneId, 
  onBack,
  initialSearch = '',
  clearInitialSearch
}) => {
  // Zone metadata state
  const [zone, setZone] = useState<HostedZone | null>(null);
  const [zoneLoading, setZoneLoading] = useState(true);

  // Records table state
  const [records, setRecords] = useState<DnsRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [recordsError, setRecordsError] = useState<string | null>(null);
  
  // Filtering & Pagination
  const [search, setSearch] = useState(initialSearch || '');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(50); // Large to fit most mock records in one view, but fully paginated
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Active tab inside Zone details
  const [activeTab, setActiveTab] = useState<'records' | 'details'>('records');

  // Selected records (for bulk delete)
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Split view side panel (Create/Edit Records)
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [panelAction, setPanelAction] = useState<'create' | 'edit'>('create');
  const [editingRecordId, setEditingRecordId] = useState<number | null>(null);

  // Record Form state
  const [formSubdomain, setFormSubdomain] = useState(''); // e.g. "www" in "www.example.com"
  const [formType, setFormType] = useState<RecordType>('A');
  const [formTtl, setFormTtl] = useState(300);
  const [formValue, setFormValue] = useState(''); // Textarea content

  // Special parameters for DNS types
  const [formPriority, setFormPriority] = useState<number>(10); // MX, SRV
  const [formWeight, setFormWeight] = useState<number>(10);     // SRV
  const [formPort, setFormPort] = useState<number>(80);         // SRV
  const [formTarget, setFormTarget] = useState<string>('');     // SRV
  const [formFlags, setFormFlags] = useState<number>(0);         // CAA
  const [formTag, setFormTag] = useState<string>('issue');      // CAA
  
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Delete Record modal state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Clipboard copies
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Toast notifications State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // 1. Fetch Hosted Zone Meta & Records
  const fetchZoneAndRecords = async () => {
    setZoneLoading(true);
    setRecordsLoading(true);
    setRecordsError(null);
    
    try {
      const zData = await api.hostedZones.get(zoneId);
      setZone(zData);
      setZoneLoading(false);

      const rData = await api.dnsRecords.list(zoneId, {
        page,
        limit,
        search,
        type: typeFilter
      });
      setRecords(rData.data);
      setTotalPages(rData.pagination.totalPages);
      setTotalCount(rData.pagination.total);
    } catch (err: any) {
      setRecordsError(err.message || 'Failed to fetch details');
    } finally {
      setZoneLoading(false);
      setRecordsLoading(false);
    }
  };

  useEffect(() => {
    fetchZoneAndRecords();
  }, [zoneId, page, search, typeFilter]);

  useEffect(() => {
    if (initialSearch) {
      setSearch(initialSearch);
      setPage(1);
      if (clearInitialSearch) {
        clearInitialSearch();
      }
    }
  }, [initialSearch, clearInitialSearch]);

  // Handle clipboard copy
  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => {
      setCopiedText(null);
    }, 2000);
  };

  // Record Form helpers
  const handleOpenCreatePanel = () => {
    setPanelAction('create');
    setEditingRecordId(null);
    setFormSubdomain('');
    setFormType('A');
    setFormTtl(300);
    setFormValue('');
    setFormPriority(10);
    setFormWeight(10);
    setFormPort(80);
    setFormTarget('');
    setFormFlags(0);
    setFormTag('issue');
    setFormError(null);
    setIsPanelOpen(true);
  };

  const handleOpenEditPanel = (record: DnsRecord) => {
    setPanelAction('edit');
    setEditingRecordId(record.id);
    
    // Extract subdomain prefix
    let subdomain = '';
    if (zone && record.name !== zone.name) {
      const suffix = `.${zone.name}`;
      if (record.name.endsWith(suffix)) {
        subdomain = record.name.substring(0, record.name.length - suffix.length);
      } else {
        subdomain = record.name;
      }
    } else {
      subdomain = ''; // apex
    }

    setFormSubdomain(subdomain);
    setFormType(record.type);
    setFormTtl(record.ttl);
    setFormValue(record.value);
    setFormPriority(record.priority || 10);
    setFormWeight(record.weight || 10);
    setFormPort(record.port || 80);
    
    // For SRV, the target or details might have been stored in value
    setFormTarget(record.value.split(' ').pop() || '');
    setFormFlags(record.flags || 0);
    setFormTag(record.tag || 'issue');
    setFormError(null);
    setIsPanelOpen(true);
  };

  // Submit record creation or edit
  const handleSubmitRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!zone) return;

    // Construct DNS full name
    const cleanSubdomain = formSubdomain.trim().toLowerCase();
    const finalRecordName = cleanSubdomain ? `${cleanSubdomain}.${zone.name}` : zone.name;

    // Validation
    let finalValue = formValue.trim();

    if (formType === 'A') {
      const ipv4Regex = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      const ips = finalValue.split('\n').map(i => i.trim()).filter(Boolean);
      if (ips.length === 0) {
        setFormError('At least one IPv4 address is required.');
        return;
      }
      for (const ip of ips) {
        if (!ipv4Regex.test(ip)) {
          setFormError(`"${ip}" is not a valid IPv4 address.`);
          return;
        }
      }
      finalValue = ips.join('\n');
    } else if (formType === 'AAAA') {
      const ips = finalValue.split('\n').map(i => i.trim()).filter(Boolean);
      if (ips.length === 0) {
        setFormError('At least one IPv6 address is required.');
        return;
      }
      finalValue = ips.join('\n');
    } else if (formType === 'CNAME') {
      if (!finalValue) {
        setFormError('CNAME target is required.');
        return;
      }
      if (finalValue === finalRecordName) {
        setFormError('CNAME loop detected: CNAME target cannot be the same as record name.');
        return;
      }
    } else if (formType === 'MX') {
      if (!finalValue) {
        setFormError('Mail Server target is required.');
        return;
      }
      // Value includes Priority for storage if requested or we can handle it
    } else if (formType === 'SRV') {
      if (!formTarget) {
        setFormError('Target host is required for SRV record.');
        return;
      }
      // Value format: "weight port target" (Priority is stored separately)
      finalValue = `${formWeight} ${formPort} ${formTarget.trim()}`;
    } else if (formType === 'TXT') {
      if (!finalValue) {
        setFormError('TXT value is required.');
        return;
      }
      // Warn if not quoted
      if (!finalValue.startsWith('"') || !finalValue.endsWith('"')) {
        finalValue = `"${finalValue.replace(/"/g, '\\"')}"`; // Autoquote safely
      }
    }

    setFormLoading(true);
    try {
      const recordData: Partial<DnsRecord> = {
        name: finalRecordName,
        type: formType,
        ttl: Number(formTtl),
        value: finalValue,
        priority: ['MX', 'SRV'].includes(formType) ? Number(formPriority) : null,
        weight: formType === 'SRV' ? Number(formWeight) : null,
        port: formType === 'SRV' ? Number(formPort) : null,
        flags: formType === 'CAA' ? Number(formFlags) : null,
        tag: formType === 'CAA' ? formTag : null,
      };

      if (panelAction === 'create') {
        await api.dnsRecords.create(zoneId, recordData);
        showToast(`Successfully created DNS record "${finalRecordName}" (${formType})`);
      } else {
        if (editingRecordId) {
          await api.dnsRecords.update(editingRecordId, recordData);
          showToast(`Successfully updated DNS record "${finalRecordName}" (${formType})`);
        }
      }

      setIsPanelOpen(false);
      fetchZoneAndRecords();
    } catch (err: any) {
      setFormError(err.message || 'Error processing DNS Record');
    } finally {
      setFormLoading(false);
    }
  };

  // Record deletions
  const handleDeleteRecords = async () => {
    setDeleteLoading(true);
    try {
      let count = 0;
      for (const id of selectedIds) {
        await api.dnsRecords.delete(id);
        count++;
      }
      showToast(`Successfully deleted ${count} DNS records.`);
      setSelectedIds([]);
      setIsDeleteOpen(false);
      fetchZoneAndRecords();
    } catch (err: any) {
      showToast(err.message || 'Error deleting records', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  // 2. EXPORT FUNCTIONS
  const handleExportJSON = () => {
    if (!zone) return;
    const exportObj = {
      exported_at: new Date().toISOString(),
      hosted_zone: {
        id: zone.id,
        name: zone.name,
        comment: zone.comment,
        type: zone.type,
        created_at: zone.created_at,
      },
      records: records.map(r => ({
        name: r.name,
        type: r.type,
        ttl: r.ttl,
        value: r.value,
        priority: r.priority,
        weight: r.weight,
        port: r.port,
        flags: r.flags,
        tag: r.tag,
      }))
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `route53_zone_${zone.name.replace(/\./g, '_')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast("Exported Hosted Zone config as JSON file!");
  };

  const handleExportBIND = () => {
    if (!zone) return;

    // BIND Zone layout header
    let bindStr = `; BIND Database Zone File for ${zone.name}\n`;
    bindStr += `; Generated by AWS Route 53 Clone Sandbox at ${new Date().toISOString()}\n\n`;
    bindStr += `$ORIGIN ${zone.name}.\n`;
    bindStr += `$TTL 3600\n\n`;

    // Map through records to generate lines
    records.forEach(r => {
      // Determine final BIND name
      const nameWithDot = r.name.endsWith('.') ? r.name : `${r.name}.`;
      
      if (r.type === 'SOA') {
        bindStr += `${nameWithDot}    ${r.ttl}    IN    SOA    ${r.value}\n`;
      } else if (r.type === 'NS') {
        const servers = r.value.split('\n');
        servers.forEach(srv => {
          bindStr += `${nameWithDot}    ${r.ttl}    IN    NS     ${srv.endsWith('.') ? srv : srv + '.'}\n`;
        });
      } else if (r.type === 'MX') {
        bindStr += `${nameWithDot}    ${r.ttl}    IN    MX     ${r.priority || 10} ${r.value}\n`;
      } else if (r.type === 'SRV') {
        bindStr += `${nameWithDot}    ${r.ttl}    IN    SRV    ${r.priority || 10} ${r.value}\n`;
      } else if (r.type === 'CAA') {
        bindStr += `${nameWithDot}    ${r.ttl}    IN    CAA    ${r.flags || 0} ${r.tag || 'issue'} "${r.value.replace(/"/g, '')}"\n`;
      } else {
        // A, AAAA, CNAME, TXT, PTR
        const values = r.value.split('\n');
        values.forEach(val => {
          bindStr += `${nameWithDot}    ${r.ttl}    IN    ${r.type}    ${val}\n`;
        });
      }
    });

    const dataStr = "data:text/plain;charset=utf-8," + encodeURIComponent(bindStr);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `db_${zone.name}.zone`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast("Exported Hosted Zone config as BIND zone format!");
  };

  // Row selection helpers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(records.map((r) => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((rowId) => rowId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center space-x-2 px-4 py-3 rounded shadow-lg text-xs text-white ${
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-xs text-aws-text-muted">
          <button onClick={onBack} className="hover:underline flex items-center space-x-1 font-semibold text-aws-blue">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Hosted zones</span>
          </button>
          <span>&gt;</span>
          <span className="text-aws-text font-medium">{zoneLoading ? 'Loading...' : zone?.name}</span>
        </div>
        
        {/* Export Action Controls */}
        {!zoneLoading && zone && (
          <div className="flex items-center space-x-2">
            <button 
              id="export_json_btn"
              onClick={handleExportJSON}
              className="px-3 py-1.5 bg-white border border-[#b8c2cc] text-aws-text font-semibold hover:bg-slate-50 rounded text-xs transition flex items-center space-x-1"
            >
              <Download className="w-3.5 h-3.5 text-aws-text-muted" />
              <span>Export JSON</span>
            </button>
            <button 
              id="export_bind_btn"
              onClick={handleExportBIND}
              className="px-3 py-1.5 bg-white border border-[#b8c2cc] text-aws-text font-semibold hover:bg-slate-50 rounded text-xs transition flex items-center space-x-1"
            >
              <Sparkles className="w-3.5 h-3.5 text-aws-orange" />
              <span>Export BIND Zone</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Metadata Overview */}
      {zoneLoading ? (
        <div className="bg-white border border-aws-border p-6 rounded shadow-sm animate-pulse h-28" />
      ) : zone ? (
        <div className="bg-white border border-aws-border p-5 rounded shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-1 border-r border-aws-border pr-4">
            <h2 className="text-xs font-bold text-aws-text uppercase tracking-wider mb-1">Domain name</h2>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-bold text-aws-text">{zone.name}</span>
              <button 
                onClick={() => handleCopyToClipboard(zone.name)}
                className="p-1 hover:bg-slate-100 rounded text-aws-text-muted transition"
                title="Copy Domain Name"
              >
                {copiedText === zone.name ? (
                  <Check className="w-3.5 h-3.5 text-green-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          <div className="md:col-span-1 border-r border-aws-border md:px-4">
            <h2 className="text-xs font-bold text-aws-text uppercase tracking-wider mb-1">Hosted zone ID</h2>
            <div className="font-mono text-sm text-aws-text">Z05{zone.id}RF98357R</div>
          </div>

          <div className="md:col-span-1 border-r border-aws-border md:px-4">
            <h2 className="text-xs font-bold text-aws-text uppercase tracking-wider mb-1">Type</h2>
            <div className="flex items-center space-x-1.5 text-xs text-aws-text mt-0.5">
              {zone.type === 'Public' ? (
                <>
                  <Globe className="w-4 h-4 text-green-600" />
                  <span>Public hosted zone</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-blue-600" />
                  <span>Private hosted zone</span>
                </>
              )}
            </div>
          </div>

          <div className="md:col-span-1 md:pl-4">
            <h2 className="text-xs font-bold text-aws-text uppercase tracking-wider mb-1">Comment</h2>
            <p className="text-xs text-aws-text-muted leading-relaxed truncate" title={zone.comment}>
              {zone.comment || <span className="italic text-gray-300">No comment</span>}
            </p>
          </div>
        </div>
      ) : null}

      {/* Main Tabs Selection */}
      <div className="flex border-b border-aws-border">
        <button
          onClick={() => setActiveTab('records')}
          className={`py-2 px-4 text-xs font-semibold border-b-2 transition ${
            activeTab === 'records'
              ? 'border-aws-orange text-aws-text'
              : 'border-transparent text-aws-text-muted hover:text-aws-text'
          }`}
        >
          Records ({totalCount})
        </button>
        <button
          onClick={() => setActiveTab('details')}
          className={`py-2 px-4 text-xs font-semibold border-b-2 transition ${
            activeTab === 'details'
              ? 'border-aws-orange text-aws-text'
              : 'border-transparent text-aws-text-muted hover:text-aws-text'
          }`}
        >
          Hosted zone details
        </button>
      </div>

      {/* DETAILS TAB */}
      {activeTab === 'details' && zone && (
        <div className="bg-white border border-aws-border rounded p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-aws-text">Hosted Zone Parameters</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs max-w-3xl">
            <div className="space-y-3">
              <div className="grid grid-cols-3 border-b border-aws-border pb-2">
                <span className="font-semibold text-aws-text-muted">Origin domain</span>
                <span className="col-span-2 text-aws-text font-mono">{zone.name}</span>
              </div>
              <div className="grid grid-cols-3 border-b border-aws-border pb-2">
                <span className="font-semibold text-aws-text-muted">Type classification</span>
                <span className="col-span-2 text-aws-text">{zone.type} Network routing</span>
              </div>
              <div className="grid grid-cols-3 border-b border-aws-border pb-2">
                <span className="font-semibold text-aws-text-muted">Status</span>
                <span className="col-span-2 text-green-600 font-semibold flex items-center space-x-1">
                  <span>●</span> <span>In-Sync (Active)</span>
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-3 border-b border-aws-border pb-2">
                <span className="font-semibold text-aws-text-muted">Created at (UTC)</span>
                <span className="col-span-2 text-aws-text">{new Date(zone.created_at).toLocaleString()}</span>
              </div>
              <div className="grid grid-cols-3 border-b border-aws-border pb-2">
                <span className="font-semibold text-aws-text-muted">Last modified</span>
                <span className="col-span-2 text-aws-text">{new Date(zone.updated_at).toLocaleString()}</span>
              </div>
              <div className="grid grid-cols-3 border-b border-aws-border pb-2">
                <span className="font-semibold text-aws-text-muted">VPC Association</span>
                <span className="col-span-2 text-aws-text-muted">{zone.type === 'Private' ? 'vpc-48357f8d' : 'None (Global/Public internet)'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RECORDS TAB & SPLIT SIDE-PANEL LAYOUT */}
      {activeTab === 'records' && (
        <div className="flex gap-4 items-start relative">
          
          {/* Squeezable Records Table (Left side container) */}
          <div className={`transition-all duration-300 space-y-4 ${
            isPanelOpen ? 'w-full lg:w-[60%] shrink-0' : 'w-full'
          }`}>
            
            {/* Table Search & Filter Controls Toolbar */}
            <div className="bg-white border border-aws-border p-4 rounded shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex flex-1 flex-wrap items-center gap-2">
                
                {/* Search Text */}
                <div className="relative max-w-xs w-full">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-aws-text-muted">
                    <Search className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Search records..."
                    className="w-full pl-8 pr-3 py-1 border border-[#b8c2cc] rounded text-xs input-focus-ring text-aws-text"
                  />
                </div>

                {/* Filter Type Dropdown */}
                <select
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value);
                    setPage(1);
                  }}
                  className="px-2 py-1 border border-[#b8c2cc] rounded text-xs bg-white text-aws-text"
                >
                  <option value="">All Types</option>
                  <option value="A">A - IPv4 Address</option>
                  <option value="AAAA">AAAA - IPv6 Address</option>
                  <option value="CNAME">CNAME - Canonical Name</option>
                  <option value="TXT">TXT - Text</option>
                  <option value="MX">MX - Mail Exchange</option>
                  <option value="NS">NS - Name Servers</option>
                  <option value="SOA">SOA - Start of Authority</option>
                  <option value="SRV">SRV - Service Locator</option>
                  <option value="CAA">CAA - Authority Authorization</option>
                </select>

              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <button
                  id="record_create_panel_btn"
                  onClick={handleOpenCreatePanel}
                  className="px-3.5 py-1.5 bg-aws-orange hover:bg-aws-orange-hover text-white rounded text-xs font-semibold shadow-sm transition flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create record</span>
                </button>
                
                <button
                  id="record_edit_panel_btn"
                  onClick={() => {
                    const r = records.find(rec => rec.id === selectedIds[0]);
                    if (r) handleOpenEditPanel(r);
                  }}
                  disabled={selectedIds.length !== 1}
                  className={`p-1.5 border rounded text-xs transition ${
                    selectedIds.length !== 1
                      ? 'bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed'
                      : 'bg-white hover:bg-slate-50 border-[#b8c2cc] text-aws-text shadow-sm'
                  }`}
                  title="Edit Record"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>

                <button
                  id="record_delete_modal_btn"
                  onClick={() => setIsDeleteOpen(true)}
                  disabled={selectedIds.length === 0}
                  className={`p-1.5 border rounded text-xs transition ${
                    selectedIds.length === 0
                      ? 'bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed'
                      : 'bg-white hover:bg-red-50 border-red-200 text-red-600 shadow-sm'
                  }`}
                  title="Delete Record"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>

            {/* Records List Table Grid */}
            <div className="bg-white border border-aws-border rounded shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  
                  <thead>
                    <tr className="aws-table-header text-aws-text border-b border-aws-border">
                      <th className="py-2.5 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={records.length > 0 && selectedIds.length === records.length}
                          onChange={handleSelectAll}
                          className="rounded text-aws-orange"
                        />
                      </th>
                      <th className="py-2.5 px-3 w-2/5 font-semibold">Record name</th>
                      <th className="py-2.5 px-3 w-16 font-semibold">Type</th>
                      <th className="py-2.5 px-3 w-16 font-semibold">TTL (s)</th>
                      <th className="py-2.5 px-3 font-semibold">Value / Route traffic to</th>
                    </tr>
                  </thead>

                  <tbody>
                    
                    {recordsLoading && (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="border-b border-aws-border animate-pulse">
                          <td className="py-3 px-3 text-center"><div className="h-3 w-3 bg-gray-200 rounded mx-auto" /></td>
                          <td className="py-3 px-3"><div className="h-3 bg-gray-200 rounded w-2/3" /></td>
                          <td className="py-3 px-3"><div className="h-3 bg-gray-200 rounded w-10" /></td>
                          <td className="py-3 px-3"><div className="h-3 bg-gray-200 rounded w-10" /></td>
                          <td className="py-3 px-3"><div className="h-3 bg-gray-200 rounded w-4/5" /></td>
                        </tr>
                      ))
                    )}

                    {!recordsLoading && recordsError && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-red-600 font-medium">
                          <div className="flex items-center justify-center space-x-1">
                            <AlertCircle className="w-4 h-4" />
                            <span>{recordsError}</span>
                          </div>
                        </td>
                      </tr>
                    )}

                    {!recordsLoading && !recordsError && records.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-aws-text-muted">
                          <p className="font-semibold text-sm mb-1 text-aws-text">No records found</p>
                          <p className="text-xs">No DNS records match your filter criteria.</p>
                        </td>
                      </tr>
                    )}

                    {!recordsLoading && !recordsError && records.map((rec) => {
                      const isSelected = selectedIds.includes(rec.id);
                      return (
                        <tr
                          key={rec.id}
                          className={`border-b border-aws-border hover:bg-[#fafafa] transition ${
                            isSelected ? 'bg-aws-active hover:bg-aws-active' : ''
                          }`}
                        >
                          <td className="py-2 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectRow(rec.id)}
                              className="rounded text-aws-orange"
                            />
                          </td>
                          <td className="py-2 px-3 font-mono text-[11px] text-aws-text break-all">
                            <div className="flex items-center space-x-1.5">
                              <span>{rec.name}</span>
                              <button
                                onClick={() => handleCopyToClipboard(rec.name)}
                                className="p-0.5 hover:bg-slate-100 rounded text-aws-text-muted transition shrink-0 opacity-0 group-hover:opacity-100 md:opacity-100"
                                title="Copy record name"
                              >
                                {copiedText === rec.name ? (
                                  <Check className="w-3 h-3 text-green-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded font-bold text-[10px] text-aws-text font-mono">
                              {rec.type}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-mono text-aws-text-muted">
                            {rec.ttl}
                          </td>
                          <td className="py-2 px-3 font-mono text-[11px] text-aws-text break-all whitespace-pre-wrap max-w-sm">
                            <div className="flex items-start justify-between gap-2">
                              <span>{rec.value}</span>
                              <button
                                onClick={() => handleCopyToClipboard(rec.value)}
                                className="p-0.5 hover:bg-slate-100 rounded text-aws-text-muted transition shrink-0"
                                title="Copy record value"
                              >
                                {copiedText === rec.value ? (
                                  <Check className="w-3 h-3 text-green-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                  </tbody>
                </table>
              </div>

              {/* Table pagination stats footer */}
              {!recordsLoading && !recordsError && records.length > 0 && (
                <div className="p-2.5 bg-slate-50 border-t border-aws-border flex items-center justify-between text-[11px] text-aws-text-muted">
                  <div>
                    Records <span className="font-semibold text-aws-text">1</span> to{' '}
                    <span className="font-semibold text-aws-text">{records.length}</span> of{' '}
                    <span className="font-semibold text-aws-text">{totalCount}</span>
                  </div>
                  {/* Since default list loads 50 records, pagination buttons are helper */}
                  {totalPages > 1 && (
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                        className="px-1 border rounded bg-white hover:bg-slate-100 disabled:opacity-40"
                      >
                        Prev
                      </button>
                      <span>Page {page} of {totalPages}</span>
                      <button 
                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                        disabled={page === totalPages}
                        className="px-1 border rounded bg-white hover:bg-slate-100 disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* SPLIT SCREEN PANEL ON THE RIGHT (SLIDES IN TO SQUEEZE THE GRID - AWS ROUTE53 STYLE) */}
          {isPanelOpen && (
            <div className="w-full lg:w-[38%] bg-white border border-[#b8c2cc] rounded shadow-md p-5 shrink-0 animate-in slide-in-from-right duration-250 flex flex-col space-y-4">
              
              {/* Panel Header */}
              <div className="flex items-center justify-between border-b border-aws-border pb-3">
                <h3 className="text-sm font-bold text-aws-text">
                  {panelAction === 'create' ? 'Create record' : 'Edit record'}
                </h3>
                <button 
                  onClick={() => setIsPanelOpen(false)}
                  className="text-aws-text-muted hover:text-aws-text font-bold text-sm p-1 hover:bg-slate-100 rounded"
                >
                  ✕
                </button>
              </div>

              {/* Form panel content */}
              <form onSubmit={handleSubmitRecord} className="space-y-4 text-xs">
                
                {formError && (
                  <div className="bg-red-50 border-l-4 border-red-600 text-red-900 p-3 rounded text-xs">
                    <p className="font-semibold">Format Validation Alert</p>
                    <p className="mt-0.5 leading-relaxed">{formError}</p>
                  </div>
                )}

                {/* Subdomain Input */}
                <div>
                  <label className="block font-semibold text-aws-text mb-1">
                    Record name
                  </label>
                  <div className="flex items-center">
                    <input
                      type="text"
                      id="form_subdomain_input"
                      value={formSubdomain}
                      onChange={(e) => setFormSubdomain(e.target.value)}
                      placeholder="e.g. www"
                      className="w-1/2 px-2.5 py-1.5 border border-[#b8c2cc] rounded-l text-xs text-right font-mono input-focus-ring text-aws-text"
                    />
                    <div className="w-1/2 px-2.5 py-1.5 border border-[#b8c2cc] border-l-0 bg-slate-50 rounded-r text-xs text-aws-text-muted font-mono truncate">
                      .{zone?.name}
                    </div>
                  </div>
                  <p className="text-[10px] text-aws-text-muted mt-1 leading-normal">
                    Enter the subdomain prefix. Leave blank for the Zone Apex ({zone?.name}).
                  </p>
                </div>

                {/* Record Type Selector */}
                <div>
                  <label className="block font-semibold text-aws-text mb-1">
                    Record type
                  </label>
                  <select
                    id="form_type_select"
                    value={formType}
                    onChange={(e) => {
                      setFormType(e.target.value as RecordType);
                      setFormError(null);
                    }}
                    className="w-full px-2.5 py-1.5 border border-[#b8c2cc] rounded text-xs bg-white text-aws-text"
                  >
                    <option value="A">A - Routes traffic to an IPv4 address</option>
                    <option value="AAAA">AAAA - Routes traffic to an IPv6 address</option>
                    <option value="CNAME">CNAME - Routes traffic to another domain name</option>
                    <option value="TXT">TXT - Arbitrary descriptive text values</option>
                    <option value="MX">MX - Routes mail traffic to servers</option>
                    <option value="NS">NS - Name servers authoritative for zone</option>
                    <option value="SOA">SOA - Start of Authority details</option>
                    <option value="SRV">SRV - Service details (port, priority, etc)</option>
                    <option value="CAA">CAA - Specifies certificate authorities</option>
                  </select>
                </div>

                {/* TTL (Seconds) */}
                <div>
                  <label className="block font-semibold text-aws-text mb-1">
                    TTL (Seconds)
                  </label>
                  <input
                    type="number"
                    id="form_ttl_input"
                    value={formTtl}
                    onChange={(e) => setFormTtl(Math.max(1, Number(e.target.value)))}
                    required
                    className="w-full px-2.5 py-1.5 border border-[#b8c2cc] rounded text-xs input-focus-ring text-aws-text font-mono"
                  />
                  <p className="text-[10px] text-aws-text-muted mt-1">
                    Time to live: standard recommendation is 300 (5 mins) or 3600 (1 hour).
                  </p>
                </div>

                {/* Conditional Fields depending on Record Type selected */}
                {formType === 'MX' && (
                  <div className="grid grid-cols-3 gap-2 border border-blue-100 bg-blue-50/20 p-2.5 rounded">
                    <div>
                      <label className="block font-semibold text-aws-text mb-1">
                        Priority
                      </label>
                      <input
                        type="number"
                        id="form_mx_priority"
                        value={formPriority}
                        onChange={(e) => setFormPriority(Number(e.target.value))}
                        className="w-full px-2 py-1 border border-[#b8c2cc] bg-white rounded text-xs font-mono text-aws-text"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block font-semibold text-aws-text mb-1">
                        Mail Server Target
                      </label>
                      <input
                        type="text"
                        id="form_mx_target"
                        value={formValue}
                        onChange={(e) => setFormValue(e.target.value)}
                        placeholder="e.g. mail.example.com"
                        className="w-full px-2 py-1 border border-[#b8c2cc] bg-white rounded text-xs font-mono text-aws-text"
                      />
                    </div>
                  </div>
                )}

                {formType === 'SRV' && (
                  <div className="space-y-2 border border-blue-100 bg-blue-50/20 p-2.5 rounded">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block font-semibold text-aws-text mb-1">Priority</label>
                        <input
                          type="number"
                          value={formPriority}
                          onChange={(e) => setFormPriority(Number(e.target.value))}
                          className="w-full px-2 py-1 border border-[#b8c2cc] bg-white rounded text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-aws-text mb-1">Weight</label>
                        <input
                          type="number"
                          value={formWeight}
                          onChange={(e) => setFormWeight(Number(e.target.value))}
                          className="w-full px-2 py-1 border border-[#b8c2cc] bg-white rounded text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-aws-text mb-1">Port</label>
                        <input
                          type="number"
                          value={formPort}
                          onChange={(e) => setFormPort(Number(e.target.value))}
                          className="w-full px-2 py-1 border border-[#b8c2cc] bg-white rounded text-xs font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block font-semibold text-aws-text mb-1">Target Host</label>
                      <input
                        type="text"
                        id="form_srv_target"
                        value={formTarget}
                        onChange={(e) => setFormTarget(e.target.value)}
                        placeholder="e.g. sip.example.com"
                        className="w-full px-2 py-1 border border-[#b8c2cc] bg-white rounded text-xs font-mono"
                      />
                    </div>
                  </div>
                )}

                {formType === 'CAA' && (
                  <div className="space-y-2 border border-blue-100 bg-blue-50/20 p-2.5 rounded">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-semibold text-aws-text mb-1">Flags</label>
                        <input
                          type="number"
                          value={formFlags}
                          onChange={(e) => setFormFlags(Number(e.target.value))}
                          className="w-full px-2 py-1 border border-[#b8c2cc] bg-white rounded text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-aws-text mb-1">Tag</label>
                        <select
                          value={formTag}
                          onChange={(e) => setFormTag(e.target.value)}
                          className="w-full px-2 py-1.5 border border-[#b8c2cc] bg-white rounded text-xs"
                        >
                          <option value="issue">issue (single provider)</option>
                          <option value="issuewild">issuewild (wildcards)</option>
                          <option value="iodef">iodef (security violation email)</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block font-semibold text-aws-text mb-1">CA Domain Value</label>
                      <input
                        type="text"
                        id="form_caa_value"
                        value={formValue}
                        onChange={(e) => setFormValue(e.target.value)}
                        placeholder="e.g. letsencrypt.org"
                        className="w-full px-2 py-1 border border-[#b8c2cc] bg-white rounded text-xs font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* Value Textarea input (For standard values or fallback) */}
                {formType !== 'SRV' && formType !== 'MX' && formType !== 'CAA' && (
                  <div>
                    <label className="block font-semibold text-aws-text mb-1">
                      Value
                    </label>
                    <textarea
                      id="form_value_textarea"
                      value={formValue}
                      onChange={(e) => setFormValue(e.target.value)}
                      required
                      placeholder={
                        formType === 'A'
                          ? 'Enter IPv4 addresses, one per line:\n192.0.2.1\n198.51.100.2'
                          : formType === 'AAAA'
                          ? 'Enter IPv6 addresses, one per line:\n2001:db8::1'
                          : formType === 'CNAME'
                          ? 'Enter target canonical domain:\nexample.com'
                          : formType === 'TXT'
                          ? '"v=spf1 include:_spf.google.com ~all"'
                          : 'Enter appropriate record contents...'
                      }
                      rows={4}
                      className="w-full px-2.5 py-1.5 border border-[#b8c2cc] rounded text-xs font-mono input-focus-ring text-aws-text"
                    />
                    <p className="text-[10px] text-aws-text-muted mt-1 leading-normal">
                      {formType === 'A' && 'Enter one IPv4 address per line.'}
                      {formType === 'AAAA' && 'Enter one IPv6 address per line.'}
                      {formType === 'CNAME' && 'Must resolve to another domain name (not an IP).'}
                      {formType === 'TXT' && 'Enclose standard strings inside double quotes.'}
                    </p>
                  </div>
                )}

                {/* Form submit/cancel actions */}
                <div className="pt-4 border-t border-aws-border flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsPanelOpen(false)}
                    className="px-3.5 py-1.5 border border-[#b8c2cc] rounded text-xs font-semibold hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    id="record_submit_btn"
                    disabled={formLoading}
                    className="px-4 py-1.5 bg-aws-orange hover:bg-aws-orange-hover text-white rounded text-xs font-semibold shadow-sm transition flex items-center space-x-1"
                  >
                    {formLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>{panelAction === 'create' ? 'Create record' : 'Save changes'}</span>
                    )}
                  </button>
                </div>

              </form>

            </div>
          )}

        </div>
      )}

      {/* DELETE RECORD MODAL */}
      {isDeleteOpen && (
        <div className="fixed inset-0 z-50 bg-[#161b22] bg-opacity-60 flex items-center justify-center p-4">
          <div className="bg-white border border-[#b8c2cc] rounded shadow-xl max-w-sm w-full overflow-hidden animate-in fade-in duration-150">
            
            <div className="p-4 bg-slate-50 border-b border-aws-border flex justify-between items-center">
              <h3 className="text-xs font-bold text-aws-text flex items-center space-x-1">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span>Delete DNS Record(s)?</span>
              </h3>
              <button 
                onClick={() => setIsDeleteOpen(false)}
                className="text-aws-text-muted hover:text-aws-text font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-aws-text leading-relaxed">
                Are you sure you want to delete the <span className="font-semibold text-red-600">{selectedIds.length} selected record(s)</span>?
              </p>
              <p className="text-aws-text-muted text-[11px] leading-relaxed">
                Warning: Once deleted, clients requesting these names will no longer receive answers and connection routing will fail immediately.
              </p>

              <div className="pt-4 border-t border-aws-border flex justify-end space-x-2">
                <button
                  onClick={() => setIsDeleteOpen(false)}
                  className="px-3.5 py-1.5 border border-[#b8c2cc] rounded text-xs font-semibold text-aws-text hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  id="record_delete_confirm_btn"
                  onClick={handleDeleteRecords}
                  disabled={deleteLoading}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold transition flex items-center space-x-1"
                >
                  {deleteLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <span>Delete records</span>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

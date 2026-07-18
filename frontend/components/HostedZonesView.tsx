import React, { useState, useEffect } from 'react';
import { HostedZone } from '../types';
import { api } from '../lib/api';
import { 
  Plus, 
  Trash2, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Loader2, 
  AlertCircle,
  HelpCircle,
  Globe,
  Lock,
  ArrowUpDown
} from 'lucide-react';

interface HostedZonesViewProps {
  onSelectZone: (zoneId: number) => void;
  onUpdateCount: (count: number) => void;
}

export const HostedZonesView: React.FC<HostedZonesViewProps> = ({ onSelectZone, onUpdateCount }) => {
  // State
  const [zones, setZones] = useState<HostedZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination & Filters
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');

  // Selected Hosted Zones (for actions)
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newComment, setNewComment] = useState('');
  const [newType, setNewType] = useState<'Public' | 'Private'>('Public');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Delete Modal State
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Toast notifications State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Fetch zones
  const fetchZones = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.hostedZones.list({
        page,
        limit,
        search,
        sortBy,
        sortOrder
      });
      setZones(response.data);
      setTotalPages(response.pagination.totalPages);
      setTotalCount(response.pagination.total);
      onUpdateCount(response.pagination.total);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch hosted zones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchZones();
  }, [page, sortBy, sortOrder, search]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Row selection helpers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(zones.map((z) => z.id));
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

  // Toggle Sort
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(field);
      setSortOrder('ASC');
    }
    setPage(1);
  };

  // Create Zone
  const handleCreateZone = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    // Basic Domain Normalisation & Validation
    const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
    const trimmedName = newName.trim().toLowerCase();

    if (!trimmedName) {
      setCreateError('Domain name is required.');
      return;
    }
    if (!domainRegex.test(trimmedName)) {
      setCreateError('Please enter a valid domain name (e.g. example.com, test.internal.local).');
      return;
    }

    setCreateLoading(true);
    try {
      await api.hostedZones.create({
        name: trimmedName,
        comment: newComment.trim(),
        type: newType
      });
      
      showToast(`Successfully created hosted zone "${trimmedName}"`);
      setIsCreateOpen(false);
      
      // Reset fields
      setNewName('');
      setNewComment('');
      setNewType('Public');
      
      // Reload list
      setPage(1);
      fetchZones();
    } catch (err: any) {
      setCreateError(err.message || 'Error creating hosted zone');
    } finally {
      setCreateLoading(false);
    }
  };

  // Delete Zone
  const handleDeleteZones = async () => {
    setDeleteLoading(true);
    try {
      let successCount = 0;
      for (const id of selectedIds) {
        await api.hostedZones.delete(id);
        successCount++;
      }
      showToast(`Successfully deleted ${successCount} hosted zone(s)`);
      setSelectedIds([]);
      setIsDeleteOpen(false);
      setPage(1);
      fetchZones();
    } catch (err: any) {
      showToast(err.message || 'Error deleting some hosted zones', 'error');
    } finally {
      setDeleteLoading(false);
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

      {/* Breadcrumbs */}
      <div className="flex items-center space-x-2 text-xs text-aws-text-muted">
        <span>Route 53</span>
        <span>&gt;</span>
        <span className="text-aws-text font-medium">Hosted zones</span>
      </div>

      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-aws-text flex items-center space-x-2">
            <span>Hosted zones</span>
            <span className="text-sm font-normal text-aws-text-muted">({totalCount})</span>
          </h1>
          <p className="text-xs text-aws-text-muted mt-1">
            A hosted zone is a container for records, and records contain information about how you want to route traffic for a domain.
          </p>
        </div>
      </div>

      {/* Grid Filter and Controls bar (AWS style) */}
      <div className="bg-white border border-aws-border p-4 rounded shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        
        {/* Search */}
        <div className="relative max-w-md w-full">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-aws-text-muted">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            id="hz_search_input"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search hosted zones (domain or description)..."
            className="w-full pl-9 pr-4 py-1.5 border border-[#b8c2cc] rounded text-xs input-focus-ring bg-[#ffffff] text-aws-text"
          />
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          
          <button
            id="hz_create_modal_btn"
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-1.5 bg-aws-orange hover:bg-aws-orange-hover text-white rounded text-xs font-semibold shadow-sm transition flex items-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create hosted zone</span>
          </button>

          <button
            id="hz_delete_modal_btn"
            onClick={() => setIsDeleteOpen(true)}
            disabled={selectedIds.length === 0}
            className={`px-4 py-1.5 border rounded text-xs font-semibold transition flex items-center space-x-1 ${
              selectedIds.length === 0
                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                : 'bg-white hover:bg-red-50 text-red-600 border-red-200 shadow-sm'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete ({selectedIds.length})</span>
          </button>
          
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-aws-border rounded shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            
            {/* Headers */}
            <thead>
              <tr className="aws-table-header text-aws-text font-semibold border-b border-aws-border">
                <th className="py-2.5 px-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={zones.length > 0 && selectedIds.length === zones.length}
                    onChange={handleSelectAll}
                    className="rounded text-aws-orange"
                  />
                </th>
                <th 
                  onClick={() => handleSort('name')}
                  className="py-2.5 px-4 cursor-pointer hover:bg-slate-100 transition select-none w-1/4"
                >
                  <div className="flex items-center space-x-1 font-semibold text-aws-text">
                    <span>Domain name</span>
                    <ArrowUpDown className="w-3 h-3 text-aws-text-muted" />
                  </div>
                </th>
                <th className="py-2.5 px-4 w-1/3">Description / Comment</th>
                <th 
                  onClick={() => handleSort('type')}
                  className="py-2.5 px-4 cursor-pointer hover:bg-slate-100 transition select-none w-1/6"
                >
                  <div className="flex items-center space-x-1 font-semibold text-aws-text">
                    <span>Type</span>
                    <ArrowUpDown className="w-3 h-3 text-aws-text-muted" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('record_count')}
                  className="py-2.5 px-4 cursor-pointer hover:bg-slate-100 transition select-none w-1/6 text-right"
                >
                  <div className="flex items-center justify-end space-x-1 font-semibold text-aws-text">
                    <span>Record count</span>
                    <ArrowUpDown className="w-3 h-3 text-aws-text-muted" />
                  </div>
                </th>
                <th className="py-2.5 px-4 text-center">Actions</th>
              </tr>
            </thead>

            {/* Body */}
            <tbody>
              
              {/* Skeletons */}
              {loading && (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={idx} className="border-b border-aws-border animate-pulse">
                    <td className="py-4 px-4 text-center"><div className="h-3.5 w-3.5 bg-gray-200 rounded mx-auto" /></td>
                    <td className="py-4 px-4"><div className="h-3.5 bg-gray-200 rounded w-4/5" /></td>
                    <td className="py-4 px-4"><div className="h-3.5 bg-gray-200 rounded w-11/12" /></td>
                    <td className="py-4 px-4"><div className="h-3.5 bg-gray-200 rounded w-1/2" /></td>
                    <td className="py-4 px-4"><div className="h-3.5 bg-gray-200 rounded w-1/3 ml-auto" /></td>
                    <td className="py-4 px-4"><div className="h-6 bg-gray-200 rounded w-16 mx-auto" /></td>
                  </tr>
                ))
              )}

              {/* Error */}
              {!loading && error && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-red-600 font-medium">
                    <div className="flex items-center justify-center space-x-2">
                      <AlertCircle className="w-5 h-5" />
                      <span>{error}</span>
                    </div>
                  </td>
                </tr>
              )}

              {/* Empty state */}
              {!loading && !error && zones.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-aws-text-muted">
                    <p className="font-semibold text-sm mb-1 text-aws-text">No hosted zones found</p>
                    {search ? (
                      <p className="text-xs">No hosted zones match your search filter "{search}". Try searching for something else.</p>
                    ) : (
                      <div>
                        <p className="text-xs mb-4">You haven't created any hosted zones in Route53 yet.</p>
                        <button
                          onClick={() => setIsCreateOpen(true)}
                          className="px-4 py-1.5 bg-aws-orange hover:bg-aws-orange-hover text-white rounded text-xs font-semibold"
                        >
                          Create hosted zone
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )}

              {/* Rows */}
              {!loading && !error && zones.map((zone) => {
                const isSelected = selectedIds.includes(zone.id);
                return (
                  <tr 
                    key={zone.id} 
                    className={`border-b border-aws-border hover:bg-[#fafafa] transition ${
                      isSelected ? 'bg-aws-active hover:bg-aws-active' : ''
                    }`}
                  >
                    <td className="py-2.5 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectRow(zone.id)}
                        className="rounded text-aws-orange"
                      />
                    </td>
                    <td className="py-2.5 px-4 font-semibold">
                      <button
                        onClick={() => onSelectZone(zone.id)}
                        className="text-aws-blue hover:underline text-left cursor-pointer font-medium"
                      >
                        {zone.name}
                      </button>
                    </td>
                    <td className="py-2.5 px-4 text-aws-text-muted truncate max-w-xs" title={zone.comment}>
                      {zone.comment || <span className="italic text-gray-300">- No comment -</span>}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center space-x-1.5">
                        {zone.type === 'Public' ? (
                          <>
                            <Globe className="w-3.5 h-3.5 text-green-600" />
                            <span>Public</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5 text-blue-600" />
                            <span>Private</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-medium text-aws-text">
                      {zone.record_count ?? 0}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <button
                        onClick={() => onSelectZone(zone.id)}
                        className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-[#b8c2cc] rounded text-[11px] font-semibold text-aws-text transition"
                      >
                        View records
                      </button>
                    </td>
                  </tr>
                );
              })}

            </tbody>
          </table>
        </div>

        {/* Footer / Pagination Controls */}
        {!loading && !error && zones.length > 0 && (
          <div className="p-3 border-t border-aws-border bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-aws-text-muted">
            <div>
              Showing zone(s) <span className="font-semibold text-aws-text">{(page - 1) * limit + 1}</span> to{' '}
              <span className="font-semibold text-aws-text">{Math.min(page * limit, totalCount)}</span> of{' '}
              <span className="font-semibold text-aws-text">{totalCount}</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className={`p-1.5 border rounded ${
                  page === 1 
                    ? 'bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed' 
                    : 'bg-white hover:bg-slate-50 border-[#b8c2cc] text-aws-text'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div className="font-medium text-aws-text">
                Page {page} of {totalPages}
              </div>

              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className={`p-1.5 border rounded ${
                  page === totalPages 
                    ? 'bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed' 
                    : 'bg-white hover:bg-slate-50 border-[#b8c2cc] text-aws-text'
                }`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-[#161b22] bg-opacity-60 flex items-center justify-center p-4">
          <div className="bg-white border border-[#b8c2cc] rounded shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            
            {/* Header */}
            <div className="p-4 bg-slate-50 border-b border-aws-border flex justify-between items-center">
              <h3 className="text-sm font-bold text-aws-text">Create hosted zone</h3>
              <button 
                onClick={() => setIsCreateOpen(false)} 
                className="text-aws-text-muted hover:text-aws-text font-semibold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateZone} className="p-6 space-y-4">
              
              {createError && (
                <div className="bg-red-50 border-l-4 border-red-600 text-red-900 p-3 rounded text-xs">
                  <p className="font-semibold">Creation Alert</p>
                  <p>{createError}</p>
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-aws-text mb-1">
                  Domain name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="new_hz_name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. mydomain.com"
                  required
                  className="w-full px-3 py-2 border border-[#b8c2cc] rounded text-xs input-focus-ring text-aws-text"
                />
                <p className="text-[10px] text-aws-text-muted mt-1">
                  Enter the domain name that you want to route traffic for. Example: example.com
                </p>
              </div>

              {/* Description/Comment */}
              <div>
                <label className="block text-xs font-semibold text-aws-text mb-1">
                  Comment
                </label>
                <textarea
                  id="new_hz_comment"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Optional description of this zone"
                  rows={2}
                  className="w-full px-3 py-2 border border-[#b8c2cc] rounded text-xs input-focus-ring text-aws-text"
                />
              </div>

              {/* Public/Private */}
              <div>
                <label className="block text-xs font-semibold text-aws-text mb-1">
                  Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`border rounded p-3 flex flex-col justify-between cursor-pointer transition select-none ${
                    newType === 'Public' ? 'border-aws-orange bg-amber-50/40 shadow-sm' : 'border-[#b8c2cc] hover:bg-slate-50'
                  }`}>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        checked={newType === 'Public'}
                        onChange={() => setNewType('Public')}
                        className="text-aws-orange"
                      />
                      <span className="text-xs font-semibold text-aws-text">Public hosted zone</span>
                    </div>
                    <p className="text-[10px] text-aws-text-muted mt-1.5 leading-relaxed">
                      Routes traffic on the public internet. Anyone can see records in this zone.
                    </p>
                  </label>

                  <label className={`border rounded p-3 flex flex-col justify-between cursor-pointer transition select-none ${
                    newType === 'Private' ? 'border-aws-orange bg-amber-50/40 shadow-sm' : 'border-[#b8c2cc] hover:bg-slate-50'
                  }`}>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        checked={newType === 'Private'}
                        onChange={() => setNewType('Private')}
                        className="text-aws-orange"
                      />
                      <span className="text-xs font-semibold text-aws-text">Private hosted zone</span>
                    </div>
                    <p className="text-[10px] text-aws-text-muted mt-1.5 leading-relaxed">
                      Routes traffic within Amazon VPC networks inside the private network.
                    </p>
                  </label>
                </div>
              </div>

              {/* Notice Box */}
              <div className="bg-slate-50 border border-aws-border p-3 rounded text-[11px] text-aws-text-muted leading-relaxed">
                ℹ️ Creating a hosted zone charges <span className="font-semibold text-aws-text">$0.50 per month</span>. 
                AWS Route53 automatically populates the newly created zone with a standard SOA and four DNS Authority Name Server (NS) records.
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-aws-border flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-1.5 border border-[#b8c2cc] rounded text-xs font-semibold text-aws-text hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="hz_create_submit_btn"
                  disabled={createLoading}
                  className="px-4 py-1.5 bg-aws-orange hover:bg-aws-orange-hover text-white rounded text-xs font-semibold shadow-sm transition flex items-center space-x-1"
                >
                  {createLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create hosted zone</span>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteOpen && (
        <div className="fixed inset-0 z-50 bg-[#161b22] bg-opacity-60 flex items-center justify-center p-4">
          <div className="bg-white border border-red-200 rounded shadow-xl max-w-md w-full overflow-hidden">
            
            {/* Header */}
            <div className="p-4 bg-red-50 border-b border-red-100 flex justify-between items-center">
              <h3 className="text-sm font-bold text-red-800 flex items-center space-x-1.5">
                <AlertCircle className="w-4 h-4" />
                <span>Delete hosted zone(s)?</span>
              </h3>
              <button 
                onClick={() => setIsDeleteOpen(false)} 
                className="text-red-700 hover:text-red-900 font-semibold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <p className="text-xs text-aws-text leading-relaxed">
                Are you sure you want to delete the <span className="font-semibold text-red-700">{selectedIds.length} selected hosted zone(s)</span>?
              </p>
              
              <div className="bg-red-50 border border-red-200 rounded p-3 text-red-800 text-[11px] leading-relaxed">
                ⚠️ <span className="font-bold">CRITICAL AWS WARNING</span>: Deleting a hosted zone is irreversible and permanently deletes all of its records (A, CNAME, MX, TXT, etc.). Traffic routed to this domain on the public web will immediately fail!
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-aws-border flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteOpen(false)}
                  disabled={deleteLoading}
                  className="px-4 py-1.5 border border-[#b8c2cc] rounded text-xs font-semibold text-aws-text hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteZones}
                  id="hz_delete_confirm_btn"
                  disabled={deleteLoading}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold shadow-sm transition flex items-center space-x-1"
                >
                  {deleteLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <span>Delete permanently</span>
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

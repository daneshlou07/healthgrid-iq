import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData, TrashItem } from '../../context/DataContext';
import { useToast } from '../../components/ux/Toast';
import { Trash2, RotateCcw, AlertTriangle, Search } from 'lucide-react';

export default function RecycleBin() {
  const { currentUser } = useAuth();
  const { trash, restoreFromTrash, permanentDelete, addAuditLog } = useData();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const filtered = trash.filter((item) => {
    const name = item.data?.name || item.data?.caseNumber || item.data?.patientName || '';
    return name.toLowerCase().includes(search.toLowerCase()) || item.type.includes(search.toLowerCase());
  });

  const handleRestore = (item: TrashItem) => {
    restoreFromTrash(item.id);
    if (currentUser) {
      addAuditLog({ userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role, action: 'ITEM_RESTORED', target: `${item.type}/${item.data?.id}`, details: `Restored from trash: ${item.data?.name || item.data?.caseNumber || 'item'}`, timestamp: new Date().toISOString() });
    }
    toast.success(`${item.data?.name || 'Item'} restored`);
  };

  const handlePermanentDelete = (item: TrashItem) => {
    permanentDelete(item.id);
    if (currentUser) {
      addAuditLog({ userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role, action: 'ITEM_PERMANENTLY_DELETED', target: `${item.type}/${item.data?.id}`, details: `Permanently deleted: ${item.data?.name || item.data?.caseNumber || 'item'}`, timestamp: new Date().toISOString() });
    }
    toast.success('Permanently deleted');
    setConfirmId(null);
  };

  const getItemName = (item: TrashItem): string => {
    return item.data?.name || item.data?.caseNumber || item.data?.patientName || 'Unknown';
  };

  const getTypeLabel = (type: string): string => {
    const labels: Record<string, string> = { user: 'User', clinic: 'Clinic', equipment: 'Equipment', patient: 'Patient', case: 'Case', patientRequest: 'Request' };
    return labels[type] || type;
  };

  const getTypeBadge = (type: string): string => {
    const badges: Record<string, string> = { user: 'badge-info', clinic: 'badge-purple', equipment: 'badge-warning', patient: 'badge-success', case: 'badge-neutral', patientRequest: 'badge-error' };
    return badges[type] || 'badge-neutral';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Recycle Bin</h1>
        <p className="page-subtitle">Deleted items are stored here. Restore or permanently delete them.</p>
      </div>

      {trash.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input type="text" placeholder="Search deleted items..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" />
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Trash2 className="w-10 h-10 text-surface-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-surface-600">Recycle Bin is empty</p>
          <p className="text-xs text-surface-400 mt-1">Deleted items will appear here for recovery.</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-200">
                <th className="table-header">Item</th>
                <th className="table-header">Type</th>
                <th className="table-header">Deleted By</th>
                <th className="table-header">Deleted At</th>
                <th className="table-header text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-surface-100 transition-colors">
                  <td className="table-cell font-medium text-surface-800">{getItemName(item)}</td>
                  <td className="table-cell"><span className={`${getTypeBadge(item.type)} text-[10px]`}>{getTypeLabel(item.type)}</span></td>
                  <td className="table-cell text-surface-500 text-xs">{item.deletedBy}</td>
                  <td className="table-cell text-surface-500 text-xs">{new Date(item.deletedAt).toLocaleString()}</td>
                  <td className="table-cell text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleRestore(item)} className="p-1.5 text-surface-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors" title="Restore">
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      {confirmId === item.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handlePermanentDelete(item)} className="px-2 py-1 bg-red-600 text-white text-[10px] rounded font-medium hover:bg-red-700">Delete Forever</button>
                          <button onClick={() => setConfirmId(null)} className="px-2 py-1 bg-surface-200 text-surface-600 text-[10px] rounded font-medium">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmId(item.id)} className="p-1.5 text-surface-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete Permanently">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {trash.length > 0 && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-amber-700">
            <p className="font-medium">Permanent deletion cannot be undone.</p>
            <p className="mt-0.5">Items in the Recycle Bin can be restored at any time. Use "Delete Forever" only when you are certain the item is no longer needed.</p>
          </div>
        </div>
      )}
    </div>
  );
}

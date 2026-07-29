import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ux/Toast';
import { Upload, Image, X } from 'lucide-react';
import { saveImage } from '../../services/imageStorage';

export default function UploadScans() {
  const [searchParams] = useSearchParams();
  const caseIdFromUrl = searchParams.get('caseId');
  const { currentUser } = useAuth();
  const { cases, editCase, addAuditLog } = useData();
  const toast = useToast();
  const [selectedCaseId, setSelectedCaseId] = useState(caseIdFromUrl || '');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // Synchronize selection if caseIdFromUrl is passed
  useEffect(() => {
    if (caseIdFromUrl) {
      setSelectedCaseId(caseIdFromUrl);
    }
  }, [caseIdFromUrl]);

  // Include assigned scheduled cases or the specifically requested case
  const availableCases = cases.filter(
    (c) => c.status === 'SCHEDULED' || c.id === caseIdFromUrl
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...selectedFiles]);
    selectedFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => setPreviews((prev) => [...prev, event.target?.result as string]);
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedCaseId || files.length === 0) return;
    setUploading(true);
    const selectedCase = availableCases.find((c) => c.id === selectedCaseId);

    // Save each image to IndexedDB and collect persistent keys
    const imageKeys: string[] = [];
    for (const dataUrl of previews) {
      const key = await saveImage(dataUrl);
      imageKeys.push(key);
    }

    // Store the IndexedDB keys (not raw base64) on the case so localStorage stays small
    await editCase(selectedCaseId, {
      status: 'SCANNED',
      scannedAt: new Date().toISOString(),
      images: imageKeys,
    });

    await addAuditLog({
      userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role,
      action: 'SCAN_UPLOADED', target: `cases/${selectedCaseId}`,
      details: `Uploaded ${files.length} image(s) for case ${selectedCase?.caseNumber}`,
      timestamp: new Date().toISOString(),
    });

    toast.success(`Case ${selectedCase?.caseNumber} updated to SCANNED`);
    setUploading(false); setFiles([]); setPreviews([]); setSelectedCaseId('');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="page-title">Upload Scans</h1>
        <p className="page-subtitle">Upload medical images and update case status to SCANNED.</p>
      </div>

      <form onSubmit={handleUpload} className="card space-y-5">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Select Case *</label>
          <select required value={selectedCaseId} onChange={(e) => setSelectedCaseId(e.target.value)} className="select-field">
            <option value="">Choose a scheduled case...</option>
            {availableCases.map((c) => <option key={c.id} value={c.id}>{c.caseNumber} — {c.patientName} ({c.scanType})</option>)}
          </select>
          {availableCases.length === 0 && <p className="text-xs text-surface-400 mt-1">No scheduled cases available.</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-700 mb-2">Medical Images *</label>
          <div className="border-2 border-dashed border-surface-300 rounded-xl p-8 text-center hover:border-navy-300 transition-colors">
            <Image className="w-8 h-8 text-surface-400 mx-auto mb-2" />
            <p className="text-sm text-surface-600 mb-2">Drop files or click to browse</p>
            <input type="file" multiple accept="image/*,.dcm" onChange={handleFileChange} className="hidden" id="scan-upload" />
            <label htmlFor="scan-upload" className="btn-secondary text-xs cursor-pointer inline-block">Choose Files</label>
          </div>
        </div>

        {previews.length > 0 && (
          <div>
            <p className="text-xs text-surface-500 mb-2">{files.length} file(s) selected</p>
            <div className="grid grid-cols-4 gap-2">
              {previews.map((preview, idx) => (
                <div key={idx} className="relative group">
                  <img src={preview} alt={`Scan ${idx + 1}`} className="w-full h-20 object-cover rounded-lg border border-surface-300" />
                  <button type="button" onClick={() => removeFile(idx)} className="absolute top-1 right-1 p-0.5 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button type="submit" disabled={uploading || !selectedCaseId || files.length === 0} className="btn-primary disabled:opacity-50">
            {uploading ? 'Uploading...' : 'Upload & Mark as Scanned'}
          </button>
        </div>
      </form>
    </div>
  );
}

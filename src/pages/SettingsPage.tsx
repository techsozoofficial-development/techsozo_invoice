import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { CompanySettings, BankDetails, AppDataBackup } from '../types';
import { invoiceRepository } from '../repositories/LocalStorageRepository';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import {
  Building2,
  Landmark,
  FileText,
  Database,
  Download,
  Upload,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Info,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const {
    companySettings,
    bankDetails,
    updateCompanySettings,
    updateBankDetails,
    resetToDemo,
    refreshAllData,
    addToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'company' | 'bank' | 'terms' | 'backup'>('company');

  // Company Form State
  const [compForm, setCompForm] = useState<CompanySettings>(companySettings);
  // Bank Form State
  const [bankForm, setBankForm] = useState<BankDetails>(bankDetails);

  // Backup & Restore State
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
  const [pendingImportData, setPendingImportData] = useState<AppDataBackup | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateCompanySettings(compForm);
  };

  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateBankDetails(bankForm);
  };

  const handleSaveTerms = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateCompanySettings({
      defaultPaymentTermsDays: compForm.defaultPaymentTermsDays,
      defaultNotes: compForm.defaultNotes,
      defaultTerms: compForm.defaultTerms,
      footerText: compForm.footerText,
    });
  };

  const handleExportBackup = async () => {
    try {
      const backup = await invoiceRepository.exportBackupData();
      const jsonStr = JSON.stringify(backup, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      a.href = url;
      a.download = `techsozo_invoices_backup_${timestamp}.json`;
      a.click();
      URL.revokeObjectURL(url);
      addToast('Backup JSON file downloaded successfully!', 'success');
    } catch (err: any) {
      addToast(err.message || 'Error exporting backup data.', 'error');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed || !Array.isArray(parsed.invoices) || !Array.isArray(parsed.clients)) {
          throw new Error('Invalid JSON structure: Missing clients or invoices array.');
        }
        setPendingImportData(parsed);
        setIsImportConfirmOpen(true);
      } catch (err: any) {
        addToast(`Invalid backup file: ${err.message}`, 'error');
      }
    };
    reader.readAsText(file);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirmImport = async () => {
    if (!pendingImportData) return;
    setIsImportConfirmOpen(false);

    try {
      const res = await invoiceRepository.importBackupData(pendingImportData, importMode);
      await refreshAllData();
      addToast(res.message, 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to restore backup.', 'error');
    } finally {
      setPendingImportData(null);
    }
  };

  const handleConfirmReset = async () => {
    setIsResetConfirmOpen(false);
    await resetToDemo();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Reset Confirmation */}
      <ConfirmModal
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleConfirmReset}
        title="Reset to Clean Workspace?"
        description="This will clear all transactions, invoices, clients, and services to provide a clean, production-ready workspace. Make sure to export a backup if you have important data."
        confirmLabel="Reset to Clean Workspace"
        variant="danger"
      />

      {/* Import Confirmation */}
      <ConfirmModal
        isOpen={isImportConfirmOpen}
        onClose={() => {
          setIsImportConfirmOpen(false);
          setPendingImportData(null);
        }}
        onConfirm={handleConfirmImport}
        title={`Confirm Restore (${importMode.toUpperCase()} mode)`}
        description={
          importMode === 'replace'
            ? 'REPLACE mode will overwrite all current invoices, clients, and services with the contents of the uploaded JSON file.'
            : 'MERGE mode will safely combine items from the backup with your existing records without duplicating IDs.'
        }
        confirmLabel={importMode === 'replace' ? 'Overwrite & Restore' : 'Merge Backup Records'}
        variant={importMode === 'replace' ? 'danger' : 'primary'}
      />

      {/* Header */}
      <div>
        <h2 className="text-2xl font-heading font-bold text-[#1A1B1E]">
          Agency & System Settings
        </h2>
        <p className="text-sm text-[#5C6068]">
          Configure legal entity data, remittance accounts, terms & notes, and local database backups.
        </p>
      </div>

      {/* Subnavigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#DAD8D2] pb-3 text-xs overflow-x-auto select-none">
        {[
          { id: 'company', label: 'Company Profile', icon: <Building2 className="w-4 h-4" /> },
          { id: 'bank', label: 'Bank Details', icon: <Landmark className="w-4 h-4" /> },
          { id: 'terms', label: 'Terms & Notes', icon: <FileText className="w-4 h-4" /> },
          { id: 'backup', label: 'Backup & Restore', icon: <Database className="w-4 h-4" /> },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-medium shrink-0 transition-all ${
                isActive
                  ? 'bg-[#292A2D] text-[#FAF9F6] font-semibold shadow-xs'
                  : 'text-[#4C5056] hover:bg-[#F1F0ED]'
              }`}
            >
              <span className={isActive ? 'text-[#C6A15B]' : 'text-[#8E929B]'}>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Company Profile */}
      {activeTab === 'company' && (
        <form onSubmit={handleSaveCompany} className="bg-white p-6 rounded-2xl border border-[#DAD8D2] shadow-xs space-y-4 max-w-2xl text-xs">
          <h3 className="font-heading font-bold text-base text-[#1A1B1E]">
            Legal Business Profile
          </h3>
          <p className="text-[#5C6068]">These details are stamped on every generated invoice and statement.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block font-medium text-[#4C5056] mb-1">Company Trade Name *</label>
              <input
                type="text"
                required
                value={compForm.companyName}
                onChange={(e) => setCompForm({ ...compForm, companyName: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#DAD8D2] rounded-xl font-medium focus:ring-2 focus:ring-[#C6A15B]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-medium text-[#4C5056] mb-1">Brand Tagline</label>
              <input
                type="text"
                value={compForm.tagline}
                onChange={(e) => setCompForm({ ...compForm, tagline: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#DAD8D2] rounded-xl focus:ring-2 focus:ring-[#C6A15B]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-medium text-[#4C5056] mb-1">Office Address</label>
              <input
                type="text"
                value={compForm.address}
                onChange={(e) => setCompForm({ ...compForm, address: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#DAD8D2] rounded-xl focus:ring-2 focus:ring-[#C6A15B]"
              />
            </div>

            <div>
              <label className="block font-medium text-[#4C5056] mb-1">City</label>
              <input
                type="text"
                value={compForm.city}
                onChange={(e) => setCompForm({ ...compForm, city: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#DAD8D2] rounded-xl focus:ring-2 focus:ring-[#C6A15B]"
              />
            </div>

            <div>
              <label className="block font-medium text-[#4C5056] mb-1">
                State
              </label>
              <input
                type="text"
                value={compForm.state}
                onChange={(e) => setCompForm({ ...compForm, state: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#DAD8D2] rounded-xl focus:ring-2 focus:ring-[#C6A15B]"
              />
            </div>

            <div>
              <label className="block font-medium text-[#4C5056] mb-1">PIN Code</label>
              <input
                type="text"
                value={compForm.pincode}
                onChange={(e) => setCompForm({ ...compForm, pincode: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#DAD8D2] rounded-xl focus:ring-2 focus:ring-[#C6A15B]"
              />
            </div>

            <div>
              <label className="block font-medium text-[#4C5056] mb-1">Contact Phone</label>
              <input
                type="text"
                value={compForm.phone}
                onChange={(e) => setCompForm({ ...compForm, phone: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#DAD8D2] rounded-xl focus:ring-2 focus:ring-[#C6A15B]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-medium text-[#4C5056] mb-1">Official Billing Email</label>
              <input
                type="email"
                value={compForm.email}
                onChange={(e) => setCompForm({ ...compForm, email: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#DAD8D2] rounded-xl focus:ring-2 focus:ring-[#C6A15B]"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-[#DAD8D2] flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#C6A15B] hover:bg-[#B38E46] text-[#292A2D] font-heading font-semibold text-xs rounded-xl shadow-xs min-h-11"
            >
              Save Company Profile
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Bank Details */}
      {activeTab === 'bank' && (
        <form onSubmit={handleSaveBank} className="bg-white p-6 rounded-2xl border border-[#DAD8D2] shadow-xs space-y-4 max-w-2xl text-xs">
          <h3 className="font-heading font-bold text-base text-[#1A1B1E]">
            Bank Remittance Accounts
          </h3>
          <p className="text-[#5C6068]">
            These bank coordinates appear directly in the remittance box on all invoices.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block font-medium text-[#4C5056] mb-1">Account Holder Name *</label>
              <input
                type="text"
                required
                value={bankForm.accountName}
                onChange={(e) => setBankForm({ ...bankForm, accountName: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#DAD8D2] rounded-xl focus:ring-2 focus:ring-[#C6A15B]"
              />
            </div>

            <div>
              <label className="block font-medium text-[#4C5056] mb-1">Account Number *</label>
              <input
                type="text"
                required
                value={bankForm.accountNumber}
                onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#DAD8D2] rounded-xl font-mono focus:ring-2 focus:ring-[#C6A15B]"
              />
            </div>

            <div>
              <label className="block font-medium text-[#4C5056] mb-1">Bank Name *</label>
              <input
                type="text"
                required
                value={bankForm.bankName}
                onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#DAD8D2] rounded-xl focus:ring-2 focus:ring-[#C6A15B]"
              />
            </div>

            <div>
              <label className="block font-medium text-[#4C5056] mb-1">Branch Name</label>
              <input
                type="text"
                value={bankForm.branch}
                onChange={(e) => setBankForm({ ...bankForm, branch: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#DAD8D2] rounded-xl focus:ring-2 focus:ring-[#C6A15B]"
              />
            </div>

            <div>
              <label className="block font-medium text-[#4C5056] mb-1">IFSC Code *</label>
              <input
                type="text"
                required
                value={bankForm.ifscCode}
                onChange={(e) => setBankForm({ ...bankForm, ifscCode: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#DAD8D2] rounded-xl font-mono uppercase focus:ring-2 focus:ring-[#C6A15B]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-medium text-[#4C5056] mb-1">UPI ID / VPA</label>
              <input
                type="text"
                value={bankForm.upiId}
                onChange={(e) => setBankForm({ ...bankForm, upiId: e.target.value })}
                placeholder="techsozo@hdfcbank"
                className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#DAD8D2] rounded-xl focus:ring-2 focus:ring-[#C6A15B]"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-[#DAD8D2] flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#C6A15B] hover:bg-[#B38E46] text-[#292A2D] font-heading font-semibold text-xs rounded-xl shadow-xs min-h-11"
            >
              Save Bank Details
            </button>
          </div>
        </form>
      )}

      {/* Tab 3: Terms & Notes */}
      {activeTab === 'terms' && (
        <form onSubmit={handleSaveTerms} className="bg-white p-6 rounded-2xl border border-[#DAD8D2] shadow-xs space-y-4 max-w-2xl text-xs">
          <h3 className="font-heading font-bold text-base text-[#1A1B1E]">
            Default Terms, Notes & Footer
          </h3>

          <div>
            <label className="block font-medium text-[#4C5056] mb-1">
              Default Payment Terms (Days to Due Date)
            </label>
            <input
              type="number"
              min="1"
              max="90"
              value={compForm.defaultPaymentTermsDays}
              onChange={(e) => setCompForm({ ...compForm, defaultPaymentTermsDays: parseInt(e.target.value) || 15 })}
              className="w-32 px-3 py-2 text-sm bg-[#FAF9F6] border border-[#DAD8D2] rounded-xl font-medium focus:ring-2 focus:ring-[#C6A15B]"
            />
          </div>

          <div>
            <label className="block font-medium text-[#4C5056] mb-1">
              Standard Client Notes
            </label>
            <textarea
              rows={3}
              value={compForm.defaultNotes}
              onChange={(e) => setCompForm({ ...compForm, defaultNotes: e.target.value })}
              className="w-full px-3 py-2 bg-[#FAF9F6] border border-[#DAD8D2] rounded-xl"
            />
          </div>

          <div>
            <label className="block font-medium text-[#4C5056] mb-1">
              Standard Terms & Conditions
            </label>
            <textarea
              rows={5}
              value={compForm.defaultTerms}
              onChange={(e) => setCompForm({ ...compForm, defaultTerms: e.target.value })}
              className="w-full px-3 py-2 bg-[#FAF9F6] border border-[#DAD8D2] rounded-xl"
            />
          </div>

          <div>
            <label className="block font-medium text-[#4C5056] mb-1">
              Document Footer Text
            </label>
            <input
              type="text"
              value={compForm.footerText}
              onChange={(e) => setCompForm({ ...compForm, footerText: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#DAD8D2] rounded-xl"
            />
          </div>

          <div className="pt-3 border-t border-[#DAD8D2] flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#C6A15B] hover:bg-[#B38E46] text-[#292A2D] font-heading font-semibold text-xs rounded-xl shadow-xs min-h-11"
            >
              Save Defaults
            </button>
          </div>
        </form>
      )}

      {/* Tab 4: Backup & Restore */}
      {activeTab === 'backup' && (
        <div className="bg-white p-6 rounded-2xl border border-[#DAD8D2] shadow-xs space-y-6 max-w-2xl text-xs">
          <div>
            <h3 className="font-heading font-bold text-base text-[#1A1B1E]">
              Data Safety, Export & Backup Management
            </h3>
            <p className="text-[#5C6068]">
              In this frontend-first phase, your application data lives safely inside your browser localStorage. Use the tools below to export full snapshots or restore records.
            </p>
          </div>

          {/* Export Card */}
          <div className="p-4 rounded-xl border border-[#DAD8D2] bg-[#FAF9F6] flex items-start justify-between gap-4">
            <div>
              <span className="font-heading font-bold text-sm text-[#1A1B1E] block mb-1">
                Export JSON Data Archive
              </span>
              <p className="text-[#5C6068] leading-relaxed max-w-md">
                Generates a clean JSON file containing all clients, services, finalized invoices, and payments. Keep a weekly copy on your local drive or cloud storage.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportBackup}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#292A2D] hover:bg-[#1E1F21] text-[#FAF9F6] font-semibold rounded-xl shrink-0 min-h-11"
            >
              <Download className="w-4 h-4 text-[#C6A15B]" />
              <span>Export Backup</span>
            </button>
          </div>

          {/* Import Card */}
          <div className="p-4 rounded-xl border border-[#DAD8D2] bg-[#FAF9F6] space-y-3">
            <div>
              <span className="font-heading font-bold text-sm text-[#1A1B1E] block mb-1">
                Restore / Import Backup File
              </span>
              <p className="text-[#5C6068]">
                Select whether to merge new records or replace your current database:
              </p>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  value="merge"
                  checked={importMode === 'merge'}
                  onChange={() => setImportMode('merge')}
                  className="text-[#C6A15B] focus:ring-[#C6A15B]"
                />
                <span className="font-semibold text-[#1A1B1E]">
                  Merge (Safely add non-duplicate records)
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  value="replace"
                  checked={importMode === 'replace'}
                  onChange={() => setImportMode('replace')}
                  className="text-[#B91C1C] focus:ring-red-500"
                />
                <span className="font-semibold text-red-700">
                  Replace (Overwrite all local data)
                </span>
              </label>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#DAD8D2] hover:border-[#C6A15B] text-[#292A2D] font-semibold rounded-xl min-h-11"
            >
              <Upload className="w-4 h-4 text-[#C6A15B]" />
              <span>Choose Backup File (.json)</span>
            </button>
          </div>

          {/* Reset Card */}
          <div className="p-4 rounded-xl border border-red-200 bg-red-50/50 flex items-start justify-between gap-4">
            <div>
              <span className="font-heading font-bold text-sm text-red-800 block mb-1">
                Reset to Clean Workspace
              </span>
              <p className="text-red-700 leading-relaxed max-w-md">
                Clears all transactions, invoices, clients, and services, restoring a clean production workspace for live client invoicing.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsResetConfirmOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl shrink-0 min-h-11"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reset to Clean Workspace</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

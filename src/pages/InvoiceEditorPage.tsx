import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Client,
  InvoiceLineItem,
  AdBudgetPeriod,
  ClientDeliverables,
  ClientAdBudget,
} from '../types';
import {
  calculateInvoiceTotals,
  calculateDefaultDueDate,
} from '../utils/calculations';
import { formatINR } from '../utils/indianNumbering';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { SyncClientServicesModal } from '../components/ui/SyncClientServicesModal';
import { ServiceAutocomplete } from '../components/ui/ServiceAutocomplete';
import { ServiceSuggestion } from '../utils/serviceSuggestions';
import {
  detectClientServiceDifferences,
  convertInvoiceItemsToClientServices,
} from '../utils/serviceDiff';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  CheckCircle,
  AlertCircle,
  FileCheck,
  Briefcase,
  Sparkles,
  Megaphone,
  Calendar,
  Lock,
  CreditCard,
  Building2,
  FileText,
  Check,
  Info,
  Layers,
  Image as ImageIcon,
  Video,
  Camera,
  RotateCcw,
} from 'lucide-react';

export const InvoiceEditorPage: React.FC = () => {
  const {
    editingDraftId,
    setEditingDraftId,
    invoices,
    clients,
    services,
    companySettings,
    bankDetails,
    payments,
    setActiveTab,
    setSelectedInvoiceId,
    saveDraftInvoice,
    finalizeInvoice,
    saveClient,
    addToast,
  } = useApp();

  const existingInvoice = invoices.find((i) => i.id === editingDraftId);

  // Helper to format default billing period (e.g., "October 2026")
  const formatDefaultBillingPeriod = (dateStr: string): string => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'October 2026';
      return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    } catch {
      return 'October 2026';
    }
  };

  // Section 1: Client & Invoice Details State
  const [clientId, setClientId] = useState<string>('');
  const [issueDate, setIssueDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [dueDate, setDueDate] = useState<string>(
    calculateDefaultDueDate(
      new Date().toISOString().split('T')[0],
      companySettings.defaultPaymentTermsDays || 15
    )
  );
  const [billingPeriod, setBillingPeriod] = useState<string>(() =>
    formatDefaultBillingPeriod(new Date().toISOString().split('T')[0])
  );

  // Section 2: Choose Billing Method State
  const [billingChoice, setBillingChoice] = useState<'package' | 'itemized' | 'custom'>('itemized');

  // Section 3: Services & Deliverables State
  const [items, setItems] = useState<InvoiceLineItem[]>([]);

  // Section 4: Client Advertising Budget State
  const [adBudgetPeriod, setAdBudgetPeriod] = useState<AdBudgetPeriod>('Monthly');
  const [adBudgetAmount, setAdBudgetAmount] = useState<number | null>(null);
  const [adCampaignName, setAdCampaignName] = useState<string>('');

  // Additional Notes & Contract Terms
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [notes, setNotes] = useState<string>(companySettings.defaultNotes || '');
  const [paymentTerms, setPaymentTerms] = useState<string>(companySettings.defaultTerms || '');

  // UI Flow & Modals State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
  const [isBlankRateModalOpen, setIsBlankRateModalOpen] = useState(false);
  const [isDoubleChargeModalOpen, setIsDoubleChargeModalOpen] = useState(false);
  const [unpricedItems, setUnpricedItems] = useState<InvoiceLineItem[]>([]);

  // Client Synchronization & Switch State
  const [isItemsModifiedByUser, setIsItemsModifiedByUser] = useState<boolean>(false);
  const [isSwitchClientModalOpen, setIsSwitchClientModalOpen] = useState<boolean>(false);
  const [pendingSwitchClientId, setPendingSwitchClientId] = useState<string | null>(null);
  const [syncModalState, setSyncModalState] = useState<{
    isOpen: boolean;
    differences: string[];
    actionType: 'save' | 'finalize';
  }>({
    isOpen: false,
    differences: [],
    actionType: 'save',
  });

  // Inline Quick Add Client Modal State
  const [isQuickClientOpen, setIsQuickClientOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientContact, setNewClientContact] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientState, setNewClientState] = useState('Tamil Nadu');

  // Helper to convert client default services to line items
  const populateItemsFromClient = (client: Client): InvoiceLineItem[] => {
    if (client.services && client.services.length > 0) {
      return client.services.map((cs, idx) => ({
        id: `item-${Date.now()}-${idx + 1}`,
        serviceId: undefined,
        description: cs.description ? `${cs.name}\n${cs.description}` : cs.name,
        quantity: cs.quantity || 1,
        rate: cs.rate != null ? Number(cs.rate) : 0,
        amount: Math.round((cs.quantity || 1) * (cs.rate != null ? Number(cs.rate) : 0) * 100) / 100,
        posterCount: null,
        reelCount: null,
        shootingSessions: null,
      }));
    }
    const defaultSrv = services[0];
    return [
      {
        id: `item-${Date.now()}-1`,
        serviceId: defaultSrv?.id,
        description: defaultSrv?.name || '',
        quantity: 1,
        rate: defaultSrv?.defaultRate || 0,
        amount: defaultSrv?.defaultRate || 0,
        posterCount: null,
        reelCount: null,
        shootingSessions: null,
      },
    ];
  };

  // Helper to create the Monthly Package consolidated line item
  const applyPackageFeeItems = (client: Client) => {
    const includedServices =
      client.services && client.services.length > 0
        ? client.services.map((s) => s.name).join(', ')
        : 'Monthly Service Retainer';

    const counts: string[] = [];
    if (client.deliverables?.posterCount && client.deliverables.posterCount > 0) {
      counts.push(`${client.deliverables.posterCount} Posters`);
    }
    if (client.deliverables?.reelCount && client.deliverables.reelCount > 0) {
      counts.push(`${client.deliverables.reelCount} Reels`);
    }
    if (client.deliverables?.shootingSessions && client.deliverables.shootingSessions > 0) {
      counts.push(`${client.deliverables.shootingSessions} Shoot Sessions`);
    }
    const countsNote = counts.length > 0 ? `\nScope: ${counts.join(' • ')}` : '';

    const packageItem: InvoiceLineItem = {
      id: `item-${Date.now()}-pkg`,
      description: `Monthly Marketing & Retainer Package\nDeliverables Scope: ${includedServices}${countsNote}`,
      quantity: 1,
      rate: client.monthlyServiceFee || 0,
      amount: client.monthlyServiceFee || 0,
      posterCount: client.deliverables?.posterCount ?? null,
      reelCount: client.deliverables?.reelCount ?? null,
      shootingSessions: client.deliverables?.shootingSessions ?? null,
    };
    setItems([packageItem]);
  };

  // Apply Client Defaults (Services, Retainers, and Ad Budget)
  const applyClientDefaults = (targetClient: Client) => {
    if (targetClient.monthlyServiceFee && targetClient.monthlyServiceFee > 0) {
      setBillingChoice('package');
      applyPackageFeeItems(targetClient);
    } else {
      setBillingChoice('itemized');
      setItems(populateItemsFromClient(targetClient));
    }

    if (targetClient.adBudget) {
      setAdBudgetPeriod(targetClient.adBudget.period || 'Monthly');
      setAdBudgetAmount(targetClient.adBudget.amount ?? null);
      setAdCampaignName(targetClient.adBudget.campaignName || '');
    } else {
      setAdBudgetPeriod('Monthly');
      setAdBudgetAmount(null);
      setAdCampaignName('');
    }
  };

  // Prepopulate if editing existing draft or initializing new invoice
  useEffect(() => {
    if (existingInvoice) {
      if (existingInvoice.isFinalized) {
        addToast('Finalized invoices cannot be edited. Opening in preview mode.', 'warning');
        setSelectedInvoiceId(existingInvoice.id);
        setActiveTab('invoices');
        return;
      }
      setClientId(existingInvoice.clientId);
      setIssueDate(existingInvoice.issueDate);
      setDueDate(existingInvoice.dueDate);
      setBillingPeriod(
        existingInvoice.billingPeriod || formatDefaultBillingPeriod(existingInvoice.issueDate)
      );
      setBillingChoice(existingInvoice.billingChoice || 'itemized');
      setItems(existingInvoice.items.length > 0 ? existingInvoice.items : []);
      setDiscountPercent(existingInvoice.discountPercent || 0);
      setNotes(existingInvoice.notes || companySettings.defaultNotes);
      setPaymentTerms(existingInvoice.paymentTerms || companySettings.defaultTerms);

      if (existingInvoice.adBudget) {
        setAdBudgetPeriod(existingInvoice.adBudget.period || 'Monthly');
        setAdBudgetAmount(existingInvoice.adBudget.amount ?? null);
        setAdCampaignName(existingInvoice.adBudget.campaignName || '');
      } else {
        const client = clients.find((c) => c.id === existingInvoice.clientId);
        if (client?.adBudget) {
          setAdBudgetPeriod(client.adBudget.period || 'Monthly');
          setAdBudgetAmount(client.adBudget.amount ?? null);
          setAdCampaignName(client.adBudget.campaignName || '');
        }
      }

      setIsItemsModifiedByUser(false);
    } else if (clients.length > 0 && !clientId) {
      const initialClient = clients[0];
      setClientId(initialClient.id);
      applyClientDefaults(initialClient);
      setBillingPeriod(formatDefaultBillingPeriod(issueDate));
      setIsItemsModifiedByUser(false);
    }
  }, [existingInvoice, clients, companySettings]);

  // Selected client record with useMemo
  const selectedClient = React.useMemo(() => clients.find((c) => c.id === clientId), [clients, clientId]);

  // Live Calculations with useMemo (prevents expensive words generation and sum reductions on unrelated state changes)
  const liveCalculation = React.useMemo(
    () =>
      calculateInvoiceTotals({
        items,
        discountPercent,
      }),
    [items, discountPercent]
  );

  // Payments recorded against this invoice (if draft has existing ledger entries)
  const existingPayments = React.useMemo(() => {
    if (!existingInvoice) return [];
    return payments.filter((p) => p.invoiceId === existingInvoice.id && !p.isReversed);
  }, [existingInvoice, payments]);

  const amountReceived = React.useMemo(
    () => existingPayments.reduce((acc, p) => acc + p.amount, 0),
    [existingPayments]
  );
  const balanceDue = Math.max(0, liveCalculation.total - amountReceived);

  // Switch Billing Method (Section 2)
  const handleSelectBillingChoice = (choice: 'package' | 'itemized' | 'custom') => {
    setBillingChoice(choice);
    setIsItemsModifiedByUser(true);

    if (choice === 'package') {
      if (!selectedClient?.monthlyServiceFee) {
        addToast('No Monthly Package Fee is configured for this client in Client Management.', 'warning');
        return;
      }
      applyPackageFeeItems(selectedClient);
      addToast(
        `Applied Monthly Package Retainer: ${formatINR(selectedClient.monthlyServiceFee)}`,
        'info'
      );
    } else if (choice === 'itemized') {
      if (selectedClient) {
        setItems(populateItemsFromClient(selectedClient));
        addToast('Switched to Individual Services pricing', 'info');
      }
    } else if (choice === 'custom') {
      const customItem: InvoiceLineItem = {
        id: `item-${Date.now()}-custom`,
        description: 'Custom Service / Deliverables',
        quantity: 1,
        rate: 0,
        amount: 0,
        posterCount: null,
        reelCount: null,
        shootingSessions: null,
      };
      setItems([customItem]);
      addToast('Switched to Custom Amount billing', 'info');
    }
  };

  // Client Selection Change with protection for modified line items
  const handleClientSelectChange = (newId: string) => {
    if (!newId || newId === clientId) {
      setClientId(newId);
      return;
    }
    const targetClient = clients.find((c) => c.id === newId);
    if (!targetClient) {
      setClientId(newId);
      return;
    }

    if (isItemsModifiedByUser) {
      setPendingSwitchClientId(newId);
      setIsSwitchClientModalOpen(true);
    } else {
      setClientId(newId);
      applyClientDefaults(targetClient);
      setIsItemsModifiedByUser(false);
    }
  };

  const confirmSwitchClient = (replaceWithServices: boolean) => {
    if (pendingSwitchClientId) {
      setClientId(pendingSwitchClientId);
      const targetClient = clients.find((c) => c.id === pendingSwitchClientId);
      if (targetClient && replaceWithServices) {
        applyClientDefaults(targetClient);
        setIsItemsModifiedByUser(false);
      }
    }
    setIsSwitchClientModalOpen(false);
    setPendingSwitchClientId(null);
  };

  // Line Item Management (Section 3)
  const handleAddItem = () => {
    setIsItemsModifiedByUser(true);
    const defaultSrv = services[0];
    const newItem: InvoiceLineItem = {
      id: `item-${Date.now()}-${items.length + 1}`,
      serviceId: defaultSrv?.id,
      description: defaultSrv?.name || '',
      quantity: 1,
      rate: billingChoice === 'package' ? 0 : defaultSrv?.defaultRate || 0,
      amount: billingChoice === 'package' ? 0 : defaultSrv?.defaultRate || 0,
      posterCount: null,
      reelCount: null,
      shootingSessions: null,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      addToast('An invoice must contain at least one service card.', 'warning');
      return;
    }
    setIsItemsModifiedByUser(true);
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof InvoiceLineItem, value: any) => {
    setIsItemsModifiedByUser(true);
    setItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[index] };

      if (field === 'quantity') {
        const qty = Math.max(0, parseFloat(value) || 0);
        item.quantity = qty;
        item.amount = Math.round(qty * item.rate * 100) / 100;
      } else if (field === 'rate') {
        const rate = Math.max(0, parseFloat(value) || 0);
        item.rate = rate;
        item.amount = Math.round(item.quantity * rate * 100) / 100;
      } else {
        (item as any)[field] = value;
      }

      copy[index] = item;
      return copy;
    });
  };

  // Deliverable Count Changes (Section 3)
  const handleItemDeliverableChange = (
    index: number,
    field: 'posterCount' | 'reelCount' | 'shootingSessions',
    val: string
  ) => {
    setIsItemsModifiedByUser(true);
    const parsed = val.trim() === '' ? null : Math.max(0, parseInt(val) || 0);
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        [field]: parsed,
      };
      return copy;
    });
  };

  const handleItemSelectSuggestion = (index: number, suggestion: ServiceSuggestion) => {
    setIsItemsModifiedByUser(true);
    setItems((prev) => {
      const copy = [...prev];
      const existingRate = copy[index].rate;
      const fullDesc = suggestion.description
        ? `${suggestion.name}\n${suggestion.description}`
        : suggestion.name;
      const newRate =
        billingChoice === 'package'
          ? 0
          : existingRate && existingRate > 0
          ? existingRate
          : suggestion.defaultRate;

      copy[index] = {
        ...copy[index],
        description: fullDesc,
        rate: newRate,
        amount: Math.round(copy[index].quantity * newRate * 100) / 100,
      };
      return copy;
    });
  };

  const handleIssueDateChange = (newDate: string) => {
    setIssueDate(newDate);
    setDueDate(calculateDefaultDueDate(newDate, companySettings.defaultPaymentTermsDays || 15));
  };

  // Construct Invoice Payload for Draft or Finalize
  const getInvoicePayload = () => {
    // Deliverable counts aggregated across items for document summary
    const totalPosters = items.reduce(
      (acc, it) => acc + (it.posterCount ? Number(it.posterCount) : 0),
      0
    );
    const totalReels = items.reduce(
      (acc, it) => acc + (it.reelCount ? Number(it.reelCount) : 0),
      0
    );
    const totalShoots = items.reduce(
      (acc, it) => acc + (it.shootingSessions ? Number(it.shootingSessions) : 0),
      0
    );

    const deliverablesSnapshot: ClientDeliverables | null =
      totalPosters > 0 || totalReels > 0 || totalShoots > 0
        ? {
            posterCount: totalPosters > 0 ? totalPosters : null,
            reelCount: totalReels > 0 ? totalReels : null,
            shootingSessions: totalShoots > 0 ? totalShoots : null,
          }
        : selectedClient?.deliverables || null;

    const adBudgetSnapshot: ClientAdBudget | null =
      adBudgetAmount && adBudgetAmount > 0
        ? {
            period: adBudgetPeriod,
            amount: adBudgetAmount,
            campaignName: adCampaignName.trim() || undefined,
          }
        : selectedClient?.adBudget || null;

    return {
      id: editingDraftId || undefined,
      clientId,
      issueDate,
      dueDate,
      billingPeriod: billingPeriod.trim() || formatDefaultBillingPeriod(issueDate),
      billingChoice,
      deliverables: deliverablesSnapshot,
      adBudget: adBudgetSnapshot,
      items,
      discountPercent,
      notes,
      paymentTerms,
    };
  };

  // Actions: Save Draft (Section 5)
  const executeSaveDraft = async () => {
    try {
      setIsSubmitting(true);
      const payload = getInvoicePayload();
      const saved = await saveDraftInvoice(payload);
      setSelectedInvoiceId(saved.id);
      setActiveTab('invoices');
    } catch (err: any) {
      // Error handled in AppContext
    } finally {
      setIsSubmitting(false);
    }
  };

  // Actions: Finalize Invoice (Section 5)
  const executeFinalize = async () => {
    try {
      setIsSubmitting(true);
      const payload = getInvoicePayload();
      const savedDraft = await saveDraftInvoice(payload);
      const finalized = await finalizeInvoice(savedDraft.id, issueDate);
      setSelectedInvoiceId(finalized.id);
      setActiveTab('invoices');
    } catch (err: any) {
      // Handled in AppContext
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!clientId) {
      addToast('Please select a client for this invoice.', 'error');
      return;
    }
    if (items.length === 0) {
      addToast('Please include at least one service card.', 'error');
      return;
    }

    const diff = detectClientServiceDifferences(selectedClient?.services || [], items);
    if (diff.hasDifferences && selectedClient) {
      setSyncModalState({
        isOpen: true,
        differences: diff.differences,
        actionType: 'save',
      });
      return;
    }

    await executeSaveDraft();
  };

  const handleOpenFinalizeModal = () => {
    if (!clientId) {
      addToast('Please select a client for this invoice.', 'error');
      return;
    }
    if (items.length === 0) {
      addToast('Please include at least one service card.', 'error');
      return;
    }

    // Protection against accidental double charging
    const hasPackageItem = items.some(
      (i) =>
        i.description.toLowerCase().includes('package') ||
        i.description.toLowerCase().includes('retainer')
    );
    const hasItemizedWithPrice = items.some(
      (i) =>
        !i.description.toLowerCase().includes('package') &&
        !i.description.toLowerCase().includes('retainer') &&
        i.rate > 0
    );

    if (hasPackageItem && hasItemizedWithPrice) {
      setIsDoubleChargeModalOpen(true);
      return;
    }

    // Protection against unpriced rates in itemized mode
    if (billingChoice === 'itemized') {
      const zeroOrBlankRateItems = items.filter(
        (item) => item.rate == null || item.rate === 0 || isNaN(item.rate)
      );

      if (zeroOrBlankRateItems.length > 0) {
        setUnpricedItems(zeroOrBlankRateItems);
        setIsBlankRateModalOpen(true);
        return;
      }
    }

    setIsFinalizeModalOpen(true);
  };

  const handleFinalizeConfirm = async () => {
    setIsFinalizeModalOpen(false);

    const diff = detectClientServiceDifferences(selectedClient?.services || [], items);
    if (diff.hasDifferences && selectedClient) {
      setSyncModalState({
        isOpen: true,
        differences: diff.differences,
        actionType: 'finalize',
      });
      return;
    }

    await executeFinalize();
  };

  const handleSyncUpdateClientAndContinue = async () => {
    const { actionType } = syncModalState;
    setSyncModalState((prev) => ({ ...prev, isOpen: false }));

    if (selectedClient) {
      try {
        const updatedServices = convertInvoiceItemsToClientServices(
          items,
          selectedClient.services || []
        );
        await saveClient({
          ...selectedClient,
          services: updatedServices,
        });
        addToast(`Updated default services for ${selectedClient.name}.`, 'success');
      } catch (e: any) {
        addToast('Failed to update client services, continuing with invoice.', 'warning');
      }
    }

    if (actionType === 'save') {
      await executeSaveDraft();
    } else {
      await executeFinalize();
    }
  };

  const handleSyncInvoiceOnly = async () => {
    const { actionType } = syncModalState;
    setSyncModalState((prev) => ({ ...prev, isOpen: false }));

    if (actionType === 'save') {
      await executeSaveDraft();
    } else {
      await executeFinalize();
    }
  };

  const handleSyncCancel = () => {
    setSyncModalState((prev) => ({ ...prev, isOpen: false }));
  };

  const handleQuickAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;

    try {
      const created = await saveClient({
        name: newClientName.trim(),
        contactPerson: newClientContact.trim(),
        email: newClientEmail.trim(),
        phone: newClientPhone.trim(),
        address: 'Thillai Nagar',
        city: 'Tiruchirappalli',
        state: newClientState.trim(),
        pincode: '620018',
        active: true,
      });

      setClientId(created.id);
      setIsQuickClientOpen(false);
      setNewClientName('');
      setNewClientContact('');
      setNewClientEmail('');
      setNewClientPhone('');
    } catch (err: any) {
      // Handled in AppContext
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ================= CONFIRMATION MODALS ================= */}

      {/* Finalize Confirmation Modal */}
      <ConfirmModal
        isOpen={isFinalizeModalOpen}
        onClose={() => setIsFinalizeModalOpen(false)}
        onConfirm={handleFinalizeConfirm}
        title="Finalize & Lock Invoice?"
        description="Finalizing will allocate the permanent sequential statutory number (INV/26-27/xxx). All deliverables and figures will be legally locked and tamper-resistant. Do you wish to proceed?"
        confirmLabel="Finalize & Lock Invoice"
        variant="primary"
        isLoading={isSubmitting}
      />

      {/* Sync Client Services Confirmation Modal */}
      <SyncClientServicesModal
        isOpen={syncModalState.isOpen}
        clientName={selectedClient?.name || 'Client'}
        differences={syncModalState.differences}
        onUpdateClientAndContinue={handleSyncUpdateClientAndContinue}
        onInvoiceOnly={handleSyncInvoiceOnly}
        onCancel={handleSyncCancel}
        actionType={syncModalState.actionType}
      />

      {/* Blank Rate Resolution Modal */}
      {isBlankRateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-[#FAF9F6] border border-[#DAD8D2] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-base text-[#1A1B1E]">
                  Unpriced Service(s) Detected
                </h3>
                <p className="text-xs text-[#5C6068]">
                  Invoice cannot be finalized with blank or ₹0 rates.
                </p>
              </div>
            </div>

            <div className="p-3 bg-white border border-[#DAD8D2] rounded-xl text-xs space-y-2">
              <p className="text-gray-700 font-medium">
                The following service(s) currently have no price assigned:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                {unpricedItems.map((item, i) => (
                  <li key={i} className="truncate font-semibold text-[#1A1B1E]">
                    {item.description.split('\n')[0] || 'Unlabeled Service'}
                  </li>
                ))}
              </ul>
              <p className="text-gray-500 pt-1 text-[11px] leading-relaxed">
                TechSozo invoices require a confirmed price for every deliverable. Please enter an individual rate, or switch to Monthly Package to bill all deliverables under one consolidated fee.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              {selectedClient?.monthlyServiceFee != null && selectedClient.monthlyServiceFee > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setIsBlankRateModalOpen(false);
                    handleSelectBillingChoice('package');
                  }}
                  className="w-full py-2.5 px-4 bg-[#C6A15B] hover:bg-[#B38E46] text-[#292A2D] font-heading font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 min-h-11"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Apply Monthly Package Fee ({formatINR(selectedClient.monthlyServiceFee)})</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsBlankRateModalOpen(false)}
                className="w-full py-2.5 px-4 bg-[#F1F0ED] hover:bg-[#E5E3DD] text-[#4C5056] font-medium text-xs rounded-xl transition-colors min-h-11"
              >
                Enter Rates Manually
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Double Charge Protection Modal */}
      {isDoubleChargeModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-[#FAF9F6] border border-red-300 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-red-100 text-red-800 rounded-xl">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-base text-[#1A1B1E]">
                  Accidental Double-Charging Detected
                </h3>
                <p className="text-xs text-[#5C6068]">
                  Package fee and individual rates cannot be billed together.
                </p>
              </div>
            </div>

            <div className="p-3 bg-white border border-[#DAD8D2] rounded-xl text-xs space-y-2">
              <p className="text-gray-700 font-medium">
                This invoice currently includes both a package fee and separate priced line items. Please choose which pricing model to keep:
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              {selectedClient?.monthlyServiceFee != null && selectedClient.monthlyServiceFee > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setIsDoubleChargeModalOpen(false);
                    handleSelectBillingChoice('package');
                  }}
                  className="w-full py-2.5 px-4 bg-[#C6A15B] hover:bg-[#B38E46] text-[#292A2D] font-heading font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 min-h-11"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Keep Monthly Package Fee Only ({formatINR(selectedClient.monthlyServiceFee)})</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setIsDoubleChargeModalOpen(false);
                  handleSelectBillingChoice('itemized');
                }}
                className="w-full py-2.5 px-4 bg-white hover:bg-gray-50 text-gray-800 border border-[#DAD8D2] font-semibold text-xs rounded-xl transition-colors min-h-11"
              >
                Keep Individual Services Only
              </button>
              <button
                type="button"
                onClick={() => setIsDoubleChargeModalOpen(false)}
                className="w-full py-2 px-4 text-[#5C6068] hover:text-[#1A1B1E] text-xs font-medium transition-colors"
              >
                Review Manually
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Switch Client Confirmation Modal */}
      {isSwitchClientModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-[#FAF9F6] border border-[#DAD8D2] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-heading font-bold text-[#1A1B1E] flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-[#C6A15B]" />
              <span>Switch Client?</span>
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              You have modified services on this invoice. Would you like to load the new client's default services or keep your current entries?
            </p>
            <div className="pt-2 flex flex-col sm:flex-row justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setIsSwitchClientModalOpen(false);
                  setPendingSwitchClientId(null);
                }}
                className="px-3.5 py-2 rounded-xl border border-[#DAD8D2] bg-white text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => confirmSwitchClient(false)}
                className="px-3.5 py-2 rounded-xl border border-[#DAD8D2] bg-white text-gray-800 font-semibold hover:bg-gray-50"
              >
                Keep Current Items
              </button>
              <button
                type="button"
                onClick={() => confirmSwitchClient(true)}
                className="px-4 py-2 rounded-xl bg-[#C6A15B] hover:bg-[#b08e4d] text-[#292A2D] font-heading font-semibold shadow-xs"
              >
                Load Client Services
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline Quick Add Client Modal */}
      {isQuickClientOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-[#FAF9F6] border border-[#DAD8D2] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#DAD8D2] pb-3">
              <h3 className="font-heading font-bold text-base text-[#1A1B1E]">
                Quick Add Client
              </h3>
              <button
                onClick={() => setIsQuickClientOpen(false)}
                className="text-[#5C6068] hover:text-[#1A1B1E] text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleQuickAddClient} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#4C5056] font-medium mb-1">
                  Business / Client Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Corp"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#DAD8D2] rounded-xl focus:ring-2 focus:ring-[#C6A15B]"
                />
              </div>

              <div>
                <label className="block text-[#4C5056] font-medium mb-1">
                  Contact Person
                </label>
                <input
                  type="text"
                  placeholder="Managing Director / Owner"
                  value={newClientContact}
                  onChange={(e) => setNewClientContact(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#DAD8D2] rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#4C5056] font-medium mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="contact@client.com"
                    value={newClientEmail}
                    onChange={(e) => setNewClientEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#DAD8D2] rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[#4C5056] font-medium mb-1">Phone</label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#DAD8D2] rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#4C5056] font-medium mb-1">State</label>
                <input
                  type="text"
                  value={newClientState}
                  onChange={(e) => setNewClientState(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#DAD8D2] rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#DAD8D2]">
                <button
                  type="button"
                  onClick={() => setIsQuickClientOpen(false)}
                  className="px-4 py-2 bg-[#F1F0ED] rounded-xl text-[#4C5056]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#C6A15B] text-[#292A2D] font-heading font-semibold rounded-xl"
                >
                  Save & Select Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= PAGE TOP HEADER & NAVIGATION ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#DAD8D2]/60">
        <button
          onClick={() => {
            setEditingDraftId(null);
            setActiveTab('invoices');
          }}
          className="flex items-center gap-2 text-xs font-semibold text-[#5C6068] hover:text-[#1A1B1E] transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Invoices Ledger</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider px-3 py-1 bg-[#FAF5E8] text-[#9A7832] rounded-full border border-[#C6A15B]/30 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#C6A15B] animate-pulse" />
            <span>{editingDraftId ? 'Editing Draft Invoice' : 'New Invoice Draft'}</span>
          </span>
        </div>
      </div>

      {/* ================= MAIN 2-COLUMN WORKSPACE ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ================= LEFT COLUMN: 4 NUMBERED SECTIONS ================= */}
        <div className="lg:col-span-8 space-y-6">
          {/* ================= SECTION 1: CLIENT & INVOICE DETAILS ================= */}
          <section className="bg-white p-6 rounded-2xl border border-[#DAD8D2] shadow-xs space-y-5">
            <div className="flex items-center gap-3 border-b border-[#F1F0ED] pb-3">
              <div className="w-7 h-7 rounded-lg bg-[#292A2D] text-[#C6A15B] font-heading font-bold text-xs flex items-center justify-center shrink-0">
                1
              </div>
              <div>
                <h3 className="font-heading font-bold text-sm text-[#1A1B1E] uppercase tracking-wider">
                  Client & Invoice Details
                </h3>
                <p className="text-xs text-[#5C6068]">
                  Select client profile and configure billing schedule.
                </p>
              </div>
            </div>

            {/* Client Selector & Info Card */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-heading font-bold text-[#1A1B1E]">
                  Bill To Client <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsQuickClientOpen(true)}
                  className="text-xs font-semibold text-[#9A7832] hover:text-[#C6A15B] flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Quick Add Client</span>
                </button>
              </div>

              <select
                value={clientId}
                onChange={(e) => handleClientSelectChange(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F6] border border-[#DAD8D2] rounded-xl focus:ring-2 focus:ring-[#C6A15B] font-medium text-[#1A1B1E]"
              >
                <option value="">-- Choose Client Profile --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.city ? `(${c.city})` : ''}
                  </option>
                ))}
              </select>

              {/* Client Profile Card */}
              {selectedClient && (
                <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#DAD8D2] text-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-heading font-bold text-sm text-[#1A1B1E]">
                          {selectedClient.name}
                        </span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                          Active Client
                        </span>
                      </div>
                      <p className="text-[#4C5056]">
                        Attn: <strong>{selectedClient.contactPerson}</strong> • {selectedClient.phone} • {selectedClient.email}
                      </p>
                      <p className="text-[#5C6068]">
                        {selectedClient.address}, {selectedClient.city}, {selectedClient.state} - {selectedClient.pincode}
                      </p>
                    </div>

                    <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-1.5 shrink-0">
                      {selectedClient.monthlyServiceFee != null && selectedClient.monthlyServiceFee > 0 && (
                        <span className="text-[11px] bg-[#FAF5E8] px-2.5 py-1 rounded-lg border border-[#C6A15B]/40 text-[#9A7832] font-heading font-bold">
                          Package: {formatINR(selectedClient.monthlyServiceFee)}/mo
                        </span>
                      )}
                      {selectedClient.services && selectedClient.services.length > 0 && (
                        <span className="text-[10px] bg-white px-2 py-0.5 rounded-md border border-[#DAD8D2] text-[#4C5056] font-medium flex items-center gap-1">
                          <Briefcase className="w-3 h-3 text-[#C6A15B]" />
                          <span>{selectedClient.services.length} Configured Services</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Sync Notice if items modified from client preset */}
                  {detectClientServiceDifferences(selectedClient.services || [], items).hasDifferences && (
                    <div className="flex items-center gap-1.5 p-2 bg-amber-50/90 border border-amber-200/80 rounded-lg text-[11px] text-amber-800 font-medium">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>Line items modified from client profile defaults. You will be prompted to sync when saving.</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 4 Fields Grid: Dates, Billing Period, Invoice Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              {/* Invoice Date */}
              <div>
                <label className="block text-xs font-medium text-[#4C5056] mb-1">
                  Invoice Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => handleIssueDateChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-[#DAD8D2] rounded-xl focus:ring-2 focus:ring-[#C6A15B] font-medium"
                  />
                </div>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-xs font-medium text-[#4C5056] mb-1">
                  Due Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-[#DAD8D2] rounded-xl focus:ring-2 focus:ring-[#C6A15B] font-medium"
                />
                <span className="text-[10px] text-[#5C6068] mt-0.5 block">
                  {companySettings.defaultPaymentTermsDays || 15} days from issue
                </span>
              </div>

              {/* Billing Period */}
              <div>
                <label className="block text-xs font-medium text-[#4C5056] mb-1">
                  Billing Period
                </label>
                <input
                  type="text"
                  value={billingPeriod}
                  onChange={(e) => setBillingPeriod(e.target.value)}
                  placeholder="e.g. October 2026"
                  className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-[#DAD8D2] rounded-xl focus:ring-2 focus:ring-[#C6A15B] font-medium"
                />
                <div className="flex items-center gap-1.5 mt-1">
                  <button
                    type="button"
                    onClick={() => setBillingPeriod(formatDefaultBillingPeriod(issueDate))}
                    className="text-[10px] text-[#9A7832] hover:underline"
                  >
                    Current Month
                  </button>
                  <span className="text-gray-300">•</span>
                  <button
                    type="button"
                    onClick={() => setBillingPeriod('Monthly Retainer')}
                    className="text-[10px] text-[#9A7832] hover:underline"
                  >
                    Retainer
                  </button>
                </div>
              </div>

              {/* Invoice Number */}
              <div>
                <label className="block text-xs font-medium text-[#4C5056] mb-1">
                  Invoice Number
                </label>
                <div className="px-3 py-2 bg-gray-100/80 border border-[#DAD8D2] rounded-xl flex items-center justify-between text-xs text-gray-700 font-medium">
                  {existingInvoice?.invoiceNumber ? (
                    <span className="font-mono font-bold text-[#1A1B1E]">
                      {existingInvoice.invoiceNumber}
                    </span>
                  ) : (
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <Lock className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-[11px]">Assigned on Finalize</span>
                    </div>
                  )}
                  <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 bg-white border border-gray-200 rounded text-gray-500 font-semibold">
                    Sequential
                  </span>
                </div>
                <span className="text-[10px] text-[#5C6068] mt-0.5 block">
                  Prevents gaps and duplicate numbers
                </span>
              </div>
            </div>
          </section>

          {/* ================= SECTION 2: CHOOSE BILLING METHOD ================= */}
          <section className="bg-white p-6 rounded-2xl border border-[#DAD8D2] shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#F1F0ED] pb-3">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-[#292A2D] text-[#C6A15B] font-heading font-bold text-xs flex items-center justify-center shrink-0">
                  2
                </div>
                <div>
                  <h3 className="font-heading font-bold text-sm text-[#1A1B1E] uppercase tracking-wider">
                    Choose Billing Method
                  </h3>
                  <p className="text-xs text-[#5C6068]">
                    Select one pricing structure for this invoice. Only one method can be active.
                  </p>
                </div>
              </div>

              {billingChoice === 'package' && selectedClient?.monthlyServiceFee && (
                <span className="text-xs font-bold text-[#9A7832] bg-[#FAF5E8] px-2.5 py-1 rounded-lg border border-[#C6A15B]/30">
                  Fixed Package: {formatINR(selectedClient.monthlyServiceFee)}
                </span>
              )}
            </div>

            {/* 3 Selectable Billing Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {/* Card A: Monthly Package */}
              <button
                type="button"
                onClick={() => handleSelectBillingChoice('package')}
                disabled={!selectedClient?.monthlyServiceFee}
                className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between relative ${
                  billingChoice === 'package'
                    ? 'bg-[#FAF5E8]/80 border-[#C6A15B] ring-2 ring-[#C6A15B]/30 shadow-xs'
                    : selectedClient?.monthlyServiceFee
                    ? 'bg-white border-[#DAD8D2] hover:border-[#C6A15B]/60 hover:bg-[#FAF9F6]'
                    : 'bg-gray-50/70 border-gray-200 opacity-60 cursor-not-allowed'
                }`}
              >
                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center justify-between">
                    <span className="font-heading font-bold text-xs text-[#1A1B1E]">
                      Monthly Package
                    </span>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        billingChoice === 'package'
                          ? 'border-[#C6A15B] bg-[#C6A15B] text-white'
                          : 'border-gray-300'
                      }`}
                    >
                      {billingChoice === 'package' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                  </div>
                  <p className="text-[11px] text-[#4C5056] leading-relaxed">
                    Charges the client's configured monthly package fee once. Included deliverables are shown for reference without separate rates.
                  </p>
                </div>

                <div className="pt-2 border-t border-[#DAD8D2]/50">
                  <span className="text-xs font-heading font-extrabold text-[#9A7832]">
                    {selectedClient?.monthlyServiceFee
                      ? `${formatINR(selectedClient.monthlyServiceFee)}/month`
                      : 'No Package Configured'}
                  </span>
                </div>
              </button>

              {/* Card B: Individual Services */}
              <button
                type="button"
                onClick={() => handleSelectBillingChoice('itemized')}
                className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between relative ${
                  billingChoice === 'itemized'
                    ? 'bg-[#FAF5E8]/80 border-[#C6A15B] ring-2 ring-[#C6A15B]/30 shadow-xs'
                    : 'bg-white border-[#DAD8D2] hover:border-[#C6A15B]/60 hover:bg-[#FAF9F6]'
                }`}
              >
                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center justify-between">
                    <span className="font-heading font-bold text-xs text-[#1A1B1E]">
                      Individual Services
                    </span>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        billingChoice === 'itemized'
                          ? 'border-[#C6A15B] bg-[#C6A15B] text-white'
                          : 'border-gray-300'
                      }`}
                    >
                      {billingChoice === 'itemized' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                  </div>
                  <p className="text-[11px] text-[#4C5056] leading-relaxed">
                    Calculates line totals from individual priced service line items based on quantity and rate. Does not add the monthly package fee.
                  </p>
                </div>

                <div className="pt-2 border-t border-[#DAD8D2]/50">
                  <span className="text-xs font-semibold text-[#1A1B1E]">
                    Itemized Unit Rates
                  </span>
                </div>
              </button>

              {/* Card C: Custom Amount */}
              <button
                type="button"
                onClick={() => handleSelectBillingChoice('custom')}
                className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between relative ${
                  billingChoice === 'custom'
                    ? 'bg-[#FAF5E8]/80 border-[#C6A15B] ring-2 ring-[#C6A15B]/30 shadow-xs'
                    : 'bg-white border-[#DAD8D2] hover:border-[#C6A15B]/60 hover:bg-[#FAF9F6]'
                }`}
              >
                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center justify-between">
                    <span className="font-heading font-bold text-xs text-[#1A1B1E]">
                      Custom Amount
                    </span>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        billingChoice === 'custom'
                          ? 'border-[#C6A15B] bg-[#C6A15B] text-white'
                          : 'border-gray-300'
                      }`}
                    >
                      {billingChoice === 'custom' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                  </div>
                  <p className="text-[11px] text-[#4C5056] leading-relaxed">
                    Allows entering a custom invoice amount and custom scope descriptions for milestone or one-off campaign retainers.
                  </p>
                </div>

                <div className="pt-2 border-t border-[#DAD8D2]/50">
                  <span className="text-xs font-semibold text-[#1A1B1E]">
                    Flexible Custom Scope
                  </span>
                </div>
              </button>
            </div>
          </section>

          {/* ================= SECTION 3: SERVICES & DELIVERABLES ================= */}
          <section className="bg-white p-6 rounded-2xl border border-[#DAD8D2] shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-[#F1F0ED] pb-3">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-[#292A2D] text-[#C6A15B] font-heading font-bold text-xs flex items-center justify-center shrink-0">
                  3
                </div>
                <div>
                  <h3 className="font-heading font-bold text-sm text-[#1A1B1E] uppercase tracking-wider">
                    Services & Deliverables
                  </h3>
                  <p className="text-xs text-[#5C6068]">
                    Configure service deliverables and optional manual counts.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF5E8] hover:bg-[#C6A15B] hover:text-[#292A2D] text-[#9A7832] font-heading font-semibold text-xs rounded-xl border border-[#C6A15B]/30 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Service Card</span>
              </button>
            </div>

            {/* Service Cards List */}
            <div className="space-y-4">
              {items.map((item, index) => {
                const serviceTitle = item.description.split('\n')[0] || '';
                const serviceScope = item.description.includes('\n')
                  ? item.description.substring(item.description.indexOf('\n') + 1)
                  : '';

                return (
                  <div
                    key={item.id}
                    className="p-5 rounded-2xl border border-[#DAD8D2] bg-[#FAF9F6] space-y-4 shadow-2xs transition-all hover:border-[#C6A15B]/50"
                  >
                    {/* Card Top Row: Title, Autocomplete & Delete */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[11px] font-heading font-bold px-2 py-0.5 rounded-md bg-[#292A2D] text-white">
                            Service Card #{index + 1}
                          </span>
                          {billingChoice === 'package' && (
                            <span className="text-[10px] font-medium text-[#9A7832] bg-[#FAF5E8] border border-[#C6A15B]/30 px-2 py-0.5 rounded-md">
                              Included in Package
                            </span>
                          )}
                        </div>

                        <label className="block text-xs font-heading font-bold text-[#1A1B1E] mb-1">
                          Service Name
                        </label>
                        <ServiceAutocomplete
                          value={serviceTitle}
                          onChange={(val) => {
                            const rest = serviceScope ? `\n${serviceScope}` : '';
                            handleItemChange(index, 'description', `${val}${rest}`);
                          }}
                          onSelectSuggestion={(sugg) => handleItemSelectSuggestion(index, sugg)}
                          catalogServices={services}
                          clientServices={selectedClient?.services || []}
                          placeholder="Select catalog service or type custom name..."
                          className="w-full px-3 py-2 text-xs bg-white border border-[#DAD8D2] rounded-xl focus:ring-2 focus:ring-[#C6A15B] font-medium"
                        />
                      </div>

                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-6"
                          title="Remove this service card"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Scope & Description Field */}
                    <div>
                      <label className="block text-xs font-medium text-[#4C5056] mb-1">
                        Description / Scope of Work
                      </label>
                      <textarea
                        rows={2}
                        value={serviceScope}
                        onChange={(e) => {
                          handleItemChange(
                            index,
                            'description',
                            serviceTitle ? `${serviceTitle}\n${e.target.value}` : e.target.value
                          );
                        }}
                        placeholder="Detailed deliverables scope (e.g. Social media creative strategy, visual identity design, performance reporting)..."
                        className="w-full px-3 py-2 text-xs bg-white border border-[#DAD8D2] rounded-xl focus:ring-2 focus:ring-[#C6A15B] leading-relaxed"
                      />
                    </div>

                    {/* Quantities, Rate & Subtotal Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-white border border-[#DAD8D2] rounded-xl text-xs items-center">
                      <div>
                        <label className="block text-[11px] font-medium text-[#4C5056] mb-1">
                          Quantity
                        </label>
                        <input
                          type="number"
                          min="0.1"
                          step="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-[#FAF9F6] border border-[#DAD8D2] rounded-lg font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-[#4C5056] mb-1">
                          {billingChoice === 'package' ? 'Individual Fee (Reference)' : 'Rate (₹)'}
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          disabled={billingChoice === 'package'}
                          value={item.rate || ''}
                          onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                          placeholder={billingChoice === 'package' ? 'Package Retainer' : 'Enter rate in ₹'}
                          className={`w-full px-2.5 py-1.5 text-xs rounded-lg font-medium border ${
                            billingChoice === 'package'
                              ? 'bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed'
                              : 'bg-[#FAF9F6] border-[#DAD8D2] focus:ring-2 focus:ring-[#C6A15B]'
                          }`}
                        />
                      </div>

                      <div className="text-right">
                        <span className="block text-[11px] font-medium text-[#4C5056] mb-1">
                          Line Total
                        </span>
                        <span className="text-sm font-heading font-bold text-[#1A1B1E] tabular-nums block">
                          {billingChoice === 'package' ? 'Incl. in Package' : formatINR(item.amount)}
                        </span>
                      </div>
                    </div>

                    {/* Deliverable Counts (Poster Count, Reel Count, Shooting Sessions) */}
                    <div className="p-3.5 bg-white border border-[#DAD8D2] rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-heading font-bold text-[#1A1B1E] flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-[#C6A15B]" />
                          <span>Deliverable Counts (Optional)</span>
                        </span>
                        <span className="text-[10px] text-gray-400">
                          Leave blank if not applicable
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* Poster Count */}
                        <div>
                          <label className="block text-[11px] font-medium text-[#4C5056] mb-1 flex items-center gap-1">
                            <ImageIcon className="w-3 h-3 text-[#5C6068]" />
                            <span>Poster Count</span>
                          </label>
                          <input
                            type="number"
                            min="0"
                            placeholder="e.g. 15"
                            value={item.posterCount != null ? item.posterCount : ''}
                            onChange={(e) =>
                              handleItemDeliverableChange(index, 'posterCount', e.target.value)
                            }
                            className="w-full px-2.5 py-1.5 text-xs bg-[#FAF9F6] border border-[#DAD8D2] rounded-lg focus:ring-2 focus:ring-[#C6A15B] font-medium"
                          />
                        </div>

                        {/* Reel Count */}
                        <div>
                          <label className="block text-[11px] font-medium text-[#4C5056] mb-1 flex items-center gap-1">
                            <Video className="w-3 h-3 text-[#5C6068]" />
                            <span>Reel Count</span>
                          </label>
                          <input
                            type="number"
                            min="0"
                            placeholder="e.g. 8"
                            value={item.reelCount != null ? item.reelCount : ''}
                            onChange={(e) =>
                              handleItemDeliverableChange(index, 'reelCount', e.target.value)
                            }
                            className="w-full px-2.5 py-1.5 text-xs bg-[#FAF9F6] border border-[#DAD8D2] rounded-lg focus:ring-2 focus:ring-[#C6A15B] font-medium"
                          />
                        </div>

                        {/* Shooting Sessions */}
                        <div>
                          <label className="block text-[11px] font-medium text-[#4C5056] mb-1 flex items-center gap-1">
                            <Camera className="w-3 h-3 text-[#5C6068]" />
                            <span>Shooting Sessions</span>
                          </label>
                          <input
                            type="number"
                            min="0"
                            placeholder="e.g. 2"
                            value={item.shootingSessions != null ? item.shootingSessions : ''}
                            onChange={(e) =>
                              handleItemDeliverableChange(index, 'shootingSessions', e.target.value)
                            }
                            className="w-full px-2.5 py-1.5 text-xs bg-[#FAF9F6] border border-[#DAD8D2] rounded-lg focus:ring-2 focus:ring-[#C6A15B] font-medium"
                          />
                        </div>
                      </div>

                      <p className="text-[10px] text-gray-500 italic">
                        * All counts are optional and blank by default. Enter counts manually when agreed with client. Unset or zero counts are never shown on the invoice.
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleAddItem}
              className="w-full py-3 border-2 border-dashed border-[#DAD8D2] hover:border-[#C6A15B] text-[#5C6068] hover:text-[#292A2D] text-xs font-heading font-semibold rounded-2xl flex items-center justify-center gap-2 transition-all hover:bg-[#FAF5E8]/30 min-h-11"
            >
              <Plus className="w-4 h-4 text-[#C6A15B]" />
              <span>Add Another Service Card</span>
            </button>
          </section>

          {/* ================= SECTION 4: CLIENT ADVERTISING BUDGET ================= */}
          <section className="bg-amber-50/40 p-6 rounded-2xl border border-amber-200/80 shadow-xs space-y-4">
            <div className="flex items-center gap-3 border-b border-amber-200/50 pb-3">
              <div className="w-7 h-7 rounded-lg bg-amber-600 text-white font-heading font-bold text-xs flex items-center justify-center shrink-0">
                4
              </div>
              <div>
                <h3 className="font-heading font-bold text-sm text-amber-950 uppercase tracking-wider flex items-center gap-2">
                  <span>Client Advertising Budget</span>
                  <span className="text-[10px] font-normal normal-case text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-200">
                    Optional • Paid Direct to Platform
                  </span>
                </h3>
                <p className="text-xs text-amber-800/80">
                  Record estimated ad spend paid directly by the client to Meta or Google. Never billed on this invoice.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 text-xs">
              {/* Period Selector */}
              <div className="sm:col-span-4">
                <label className="block text-[11px] font-medium text-amber-900 mb-1">
                  Budget Frequency
                </label>
                <div className="flex rounded-xl p-1 bg-white border border-amber-200">
                  <button
                    type="button"
                    onClick={() => setAdBudgetPeriod('Monthly')}
                    className={`flex-1 py-1 px-2 rounded-lg text-xs font-semibold transition-all ${
                      adBudgetPeriod === 'Monthly'
                        ? 'bg-[#C6A15B] text-[#292A2D] shadow-2xs'
                        : 'text-amber-800 hover:text-amber-950'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdBudgetPeriod('One-Time Campaign')}
                    className={`flex-1 py-1 px-2 rounded-lg text-xs font-semibold transition-all ${
                      adBudgetPeriod === 'One-Time Campaign'
                        ? 'bg-[#C6A15B] text-[#292A2D] shadow-2xs'
                        : 'text-amber-800 hover:text-amber-950'
                    }`}
                  >
                    Campaign
                  </button>
                </div>
              </div>

              {/* Estimated Budget Amount */}
              <div className="sm:col-span-4">
                <label className="block text-[11px] font-medium text-amber-900 mb-1">
                  Estimated Ad Budget (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 50000"
                  value={adBudgetAmount != null ? adBudgetAmount : ''}
                  onChange={(e) =>
                    setAdBudgetAmount(e.target.value === '' ? null : parseFloat(e.target.value) || 0)
                  }
                  className="w-full px-3 py-2 text-xs bg-white border border-amber-200 rounded-xl focus:ring-2 focus:ring-[#C6A15B] font-medium"
                />
              </div>

              {/* Campaign / Platform Name */}
              <div className="sm:col-span-4">
                <label className="block text-[11px] font-medium text-amber-900 mb-1">
                  Campaign / Platform Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Meta Ads & Google PMax"
                  value={adCampaignName}
                  onChange={(e) => setAdCampaignName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-amber-200 rounded-xl focus:ring-2 focus:ring-[#C6A15B] font-medium"
                />
              </div>
            </div>

            <div className="p-3 bg-amber-100/50 rounded-xl border border-amber-200/60 text-[11px] text-amber-900 leading-relaxed flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                Optional. Enter the client's advertising budget only when known. This amount is paid directly by the client to Meta, Google, or the relevant advertising platform. It is separate from TechSozo's service fee and is <strong>never included</strong> in the invoice subtotal or grand total automatically.
              </span>
            </div>
          </section>

          {/* ================= CONTRACT NOTES & PAYMENT TERMS ================= */}
          <section className="bg-white p-6 rounded-2xl border border-[#DAD8D2] shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#DAD8D2] pb-3">
              <div>
                <h3 className="font-heading font-bold text-sm text-[#1A1B1E] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#C6A15B]" />
                  <span>Client Notes & Payment Terms</span>
                </h3>
                <p className="text-xs text-[#5C6068] mt-0.5">
                  Custom remittance guidance, client instructions, and formal agency contract clauses for this invoice.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6">
              {/* Left Editor: Client Notes & Remittance Message */}
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label htmlFor="invoice-notes-editor" className="text-xs font-heading font-semibold text-[#1A1B1E] block">
                      Client Notes & Remittance Message
                    </label>
                    <span className="text-[11px] text-[#5C6068]">
                      Appears on the client's invoice statement & remittance slip
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const defaultVal = companySettings.defaultNotes || '';
                      if (notes === defaultVal) {
                        addToast('Notes are already set to default template.', 'info');
                        return;
                      }
                      if (window.confirm('Reset Client Notes to the agency default template?')) {
                        setNotes(defaultVal);
                        addToast('Client notes reset to default template.', 'info');
                      }
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-[#9A7832] hover:text-[#C6A15B] hover:bg-[#FAF5E8] px-2 py-1 rounded-lg transition-colors border border-transparent hover:border-[#C6A15B]/30"
                    title="Reset to default notes template"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                </div>

                <div className="relative flex-1 flex flex-col">
                  <textarea
                    id="invoice-notes-editor"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter custom remittance instructions, thank you notes, or client-specific billing remarks..."
                    className="w-full flex-1 min-h-[190px] md:min-h-[240px] p-3.5 text-sm leading-relaxed bg-[#FAF9F6] border border-[#DAD8D2] hover:border-[#C6A15B]/60 focus:border-[#C6A15B] rounded-xl focus:ring-2 focus:ring-[#C6A15B] focus:outline-none transition-all resize-y text-[#1A1B1E] placeholder:text-[#8E929B]"
                  />
                  <div className="flex items-center justify-between text-[11px] text-[#5C6068] mt-1.5 px-1">
                    <span>Preserves line breaks & lists</span>
                    <span className="tabular-nums font-medium">
                      {notes.length} chars • {notes ? notes.split('\n').length : 0} lines
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Editor: Payment Terms & Conditions */}
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label htmlFor="invoice-terms-editor" className="text-xs font-heading font-semibold text-[#1A1B1E] block">
                      Payment Terms & Conditions
                    </label>
                    <span className="text-[11px] text-[#5C6068]">
                      Statutory payment terms, schedule & agency clauses
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const defaultVal = companySettings.defaultTerms || '';
                      if (paymentTerms === defaultVal) {
                        addToast('Payment terms are already set to default template.', 'info');
                        return;
                      }
                      if (window.confirm('Reset Payment Terms to the agency default template?')) {
                        setPaymentTerms(defaultVal);
                        addToast('Payment terms reset to default template.', 'info');
                      }
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-[#9A7832] hover:text-[#C6A15B] hover:bg-[#FAF5E8] px-2 py-1 rounded-lg transition-colors border border-transparent hover:border-[#C6A15B]/30"
                    title="Reset to default payment terms"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                </div>

                <div className="relative flex-1 flex flex-col">
                  <textarea
                    id="invoice-terms-editor"
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    placeholder="Enter formal payment conditions, late fee policies, delivery milestones..."
                    className="w-full flex-1 min-h-[190px] md:min-h-[240px] p-3.5 text-sm leading-relaxed bg-[#FAF9F6] border border-[#DAD8D2] hover:border-[#C6A15B]/60 focus:border-[#C6A15B] rounded-xl focus:ring-2 focus:ring-[#C6A15B] focus:outline-none transition-all resize-y text-[#1A1B1E] placeholder:text-[#8E929B]"
                  />
                  <div className="flex items-center justify-between text-[11px] text-[#5C6068] mt-1.5 px-1">
                    <span>Preserves line breaks & lists</span>
                    <span className="tabular-nums font-medium">
                      {paymentTerms.length} chars • {paymentTerms ? paymentTerms.split('\n').length : 0} lines
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* ================= RIGHT COLUMN: LIVE INVOICE SUMMARY ================= */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white p-6 rounded-2xl border border-[#DAD8D2] shadow-md sticky top-6 space-y-5">
            {/* Header */}
            <div className="border-b border-[#DAD8D2] pb-3">
              <span className="text-[10px] font-heading font-extrabold uppercase tracking-wider text-[#9A7832] block">
                Accounting Summary
              </span>
              <h3 className="font-heading font-bold text-lg text-[#1A1B1E]">
                Invoice Summary
              </h3>
            </div>

            {/* Overview Strip */}
            <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#DAD8D2] text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[#5C6068]">Client:</span>
                <span className="font-heading font-bold text-[#1A1B1E] truncate max-w-[180px]">
                  {selectedClient?.name || 'No Client Selected'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#5C6068]">Billing Method:</span>
                <span className="font-semibold text-[#9A7832] bg-[#FAF5E8] px-2 py-0.5 rounded border border-[#C6A15B]/30 capitalize">
                  {billingChoice === 'package'
                    ? 'Monthly Package'
                    : billingChoice === 'itemized'
                    ? 'Individual Services'
                    : 'Custom Amount'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#5C6068]">Billing Period:</span>
                <span className="font-medium text-[#1A1B1E]">{billingPeriod}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-gray-200/60">
                <span className="text-[#5C6068]">Invoice / Due:</span>
                <span className="text-[#1A1B1E]">
                  {issueDate} → {dueDate}
                </span>
              </div>
            </div>

            {/* Agreed Deliverables Scope Chips (if configured) */}
            {(() => {
              const totalPosters = items.reduce(
                (acc, it) => acc + (it.posterCount ? Number(it.posterCount) : 0),
                0
              );
              const totalReels = items.reduce(
                (acc, it) => acc + (it.reelCount ? Number(it.reelCount) : 0),
                0
              );
              const totalShoots = items.reduce(
                (acc, it) => acc + (it.shootingSessions ? Number(it.shootingSessions) : 0),
                0
              );

              if (totalPosters === 0 && totalReels === 0 && totalShoots === 0) return null;

              return (
                <div className="p-3 bg-white border border-[#DAD8D2] rounded-xl text-xs space-y-1.5">
                  <span className="text-[10px] font-bold text-[#5C6068] uppercase tracking-wider block">
                    Deliverables Scope:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {totalPosters > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-[#FAF5E8] border border-[#C6A15B]/40 text-[#9A7832] font-semibold text-[11px]">
                        {totalPosters} Posters
                      </span>
                    )}
                    {totalReels > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-[#FAF5E8] border border-[#C6A15B]/40 text-[#9A7832] font-semibold text-[11px]">
                        {totalReels} Reels
                      </span>
                    )}
                    {totalShoots > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-[#FAF5E8] border border-[#C6A15B]/40 text-[#9A7832] font-semibold text-[11px]">
                        {totalShoots} Shooting Sessions
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Financial Line Items */}
            <div className="space-y-2.5 text-xs text-[#4C5056]">
              <div className="flex justify-between items-center">
                <span>
                  {billingChoice === 'package'
                    ? 'Package Retainer Fee:'
                    : `Services Subtotal (${items.length} card${items.length > 1 ? 's' : ''}):`}
                </span>
                <span className="font-heading font-semibold text-[#1A1B1E] tabular-nums">
                  {formatINR(liveCalculation.subtotal)}
                </span>
              </div>

              {/* Discount Input */}
              <div className="pt-2 border-t border-[#F1F0ED]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-gray-600">Discount (%):</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                      className="w-16 px-2 py-1 text-right text-xs bg-[#FAF9F6] border border-[#DAD8D2] rounded-lg font-medium"
                    />
                    <span className="text-gray-500 font-medium">%</span>
                  </div>
                </div>
                {liveCalculation.discountAmount > 0 && (
                  <div className="flex justify-between items-center text-red-600 mt-1">
                    <span>Discount Deduction:</span>
                    <span className="tabular-nums font-semibold">
                      - {formatINR(liveCalculation.discountAmount)}
                    </span>
                  </div>
                )}
              </div>

              {/* Round-off */}
              {liveCalculation.roundOff !== 0 && (
                <div className="flex justify-between items-center pt-2 border-t border-[#F1F0ED] text-[11px]">
                  <span>Round-off:</span>
                  <span className="tabular-nums font-medium">
                    {liveCalculation.roundOff > 0
                      ? `+${liveCalculation.roundOff}`
                      : liveCalculation.roundOff}
                  </span>
                </div>
              )}
            </div>

            {/* Grand Total Payable */}
            <div className="pt-3 border-t-2 border-[#292A2D] flex justify-between items-baseline">
              <span className="font-heading font-bold text-sm text-[#292A2D]">
                Total Payable:
              </span>
              <span className="font-heading font-extrabold text-2xl text-[#292A2D] tabular-nums">
                {formatINR(liveCalculation.total)}
              </span>
            </div>

            {/* Amount In Words (Indian System) */}
            <div className="p-3 rounded-xl bg-[#FAF5E8] border border-[#C6A15B]/30 text-xs">
              <span className="text-[10px] uppercase font-heading font-bold text-[#9A7832] block mb-0.5">
                Amount in Words (INR):
              </span>
              <p className="font-heading font-semibold text-[#292A2D] leading-snug">
                {liveCalculation.amountInWords}
              </p>
            </div>

            {/* Payment & Balance Due Tracking */}
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs space-y-1.5">
              <div className="flex justify-between items-center text-gray-600">
                <span>Amount Received:</span>
                <span className="font-semibold text-emerald-700 tabular-nums">
                  {formatINR(amountReceived)}
                </span>
              </div>
              <div className="flex justify-between items-center text-[#1A1B1E] pt-1 border-t border-gray-200">
                <span className="font-bold">Balance Due:</span>
                <span className="font-heading font-bold text-sm text-[#9A7832] tabular-nums">
                  {formatINR(balanceDue)}
                </span>
              </div>
            </div>

            {/* Platform Ad Spend Reference Box (Strictly Separate from Invoice Total) */}
            {adBudgetAmount != null && adBudgetAmount > 0 && (
              <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-950">
                  <Megaphone className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Platform Ad Budget ({adBudgetPeriod})</span>
                </div>
                <div className="flex justify-between items-baseline pt-0.5">
                  <span className="text-[11px] text-amber-800">
                    {adCampaignName || 'Client Platform Spend'}:
                  </span>
                  <span className="font-bold text-amber-950 tabular-nums">
                    {formatINR(adBudgetAmount)}
                  </span>
                </div>
                <span className="text-[10px] text-amber-700 block italic">
                  * Paid directly by client to Meta/Google. Not added to invoice total.
                </span>
              </div>
            )}

            {/* Payment Remittance Instructions */}
            <div className="p-3 rounded-xl border border-[#DAD8D2] bg-white text-xs space-y-1 text-gray-600">
              <span className="text-[10px] font-heading font-bold text-[#5C6068] uppercase tracking-wider block mb-1">
                Remittance Account Details:
              </span>
              <p>
                <strong>{bankDetails.bankName || 'HDFC Bank'}</strong> • A/C: <span className="font-mono">{bankDetails.accountNumber}</span>
              </p>
              <p>
                IFSC: <span className="font-mono">{bankDetails.ifscCode}</span> • UPI: <span className="font-mono">{bankDetails.upiId}</span>
              </p>
            </div>

            {/* Action Buttons (Section 5) */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#FAF9F6] hover:bg-[#F1F0ED] text-[#292A2D] font-heading font-semibold text-xs rounded-xl border border-[#DAD8D2] transition-colors min-h-11 shadow-2xs"
              >
                <Save className="w-4 h-4 text-[#5C6068]" />
                <span>Save Draft (No Number Assigned)</span>
              </button>

              <button
                type="button"
                onClick={handleOpenFinalizeModal}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#C6A15B] hover:bg-[#B38E46] text-[#292A2D] font-heading font-bold text-sm rounded-xl shadow-md transition-all active:scale-[0.98] min-h-11"
              >
                <FileCheck className="w-4 h-4 stroke-[2.5]" />
                <span>Finalize & Assign Invoice #</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

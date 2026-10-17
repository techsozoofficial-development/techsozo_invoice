import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AppShell } from './components/layout/AppShell';
import { DashboardPage } from './pages/DashboardPage';
import { InvoicesListPage } from './pages/InvoicesListPage';
import { InvoiceEditorPage } from './pages/InvoiceEditorPage';
import { InvoicePreviewPage } from './pages/InvoicePreviewPage';
import { ClientsPage } from './pages/ClientsPage';
import { ServicesPage } from './pages/ServicesPage';
import { SettingsPage } from './pages/SettingsPage';
import { PendingInvoicesPage } from './pages/PendingInvoicesPage';

const AppContent: React.FC = () => {
  const { activeTab, setActiveTab, selectedInvoiceId, setSelectedInvoiceId } = useApp();

  // If a specific invoice is selected to preview, display the preview view
  if (selectedInvoiceId) {
    return (
      <InvoicePreviewPage
        invoiceId={selectedInvoiceId}
        onBack={() => setSelectedInvoiceId(null)}
      />
    );
  }

  switch (activeTab) {
    case 'dashboard':
      return <DashboardPage />;
    case 'invoices':
      return <InvoicesListPage />;
    case 'pending_invoices':
      return <PendingInvoicesPage onBack={() => setActiveTab('dashboard')} />;
    case 'create_invoice':
      return <InvoiceEditorPage />;
    case 'clients':
      return <ClientsPage />;
    case 'services':
      return <ServicesPage />;
    case 'settings':
      return <SettingsPage />;
    default:
      return <DashboardPage />;
  }
};

export function App() {
  return (
    <AppProvider>
      <AppShell>
        <AppContent />
      </AppShell>
    </AppProvider>
  );
}

export default App;

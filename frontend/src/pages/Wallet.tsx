import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Wallet as WalletIcon, 
  Send, 
  Plus, 
  Search, 
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  Shield,
  Clock,
  CheckCircle,
  X
} from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

const Wallet = () => {
  useAuth();
  const [balance, setBalance] = useState(0);
  const [transferData, setTransferData] = useState({ toUserId: '', amount: '', description: '' });
  const [depositAmount, setDepositAmount] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'transfer' | 'deposit' | 'search'>('transfer');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [transactionDetails, setTransactionDetails] = useState<any>(null);

  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/wallet/balance`);
      setBalance(response.data.balance);
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await axios.post(`${API_URL}/api/wallet/transfer`, {
        toUserId: transferData.toUserId,
        amount: parseFloat(transferData.amount),
        description: transferData.description,
      });

      setTransactionDetails({
        type: 'Transfer',
        amount: parseFloat(transferData.amount),
        recipient: transferData.toUserId,
        ...response.data
      });
      setShowSuccessModal(true);
      setTransferData({ toUserId: '', amount: '', description: '' });
      fetchBalance();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Transfer failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await axios.post(`${API_URL}/api/wallet/deposit`, {
        amount: parseFloat(depositAmount),
      });

      setTransactionDetails({
        type: 'Deposit',
        amount: parseFloat(depositAmount),
        ...response.data
      });
      setShowSuccessModal(true);
      setDepositAmount('');
      fetchBalance();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Deposit failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const queryObj = searchQuery ? JSON.parse(searchQuery) : {};
      const params = new URLSearchParams(queryObj);
      const response = await axios.get(`${API_URL}/api/wallet/search?${params}`);
      setSearchResults(response.data);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Search failed' });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">My Wallet</h1>
        <p className="page-subtitle">Manage your funds and transfers securely</p>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Balance */}
        <div className="lg:col-span-2 card-premium p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur">
                  <WalletIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-primary-200 text-sm font-medium">Available Balance</p>
                  <p className="text-white/60 text-xs">USD Account</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1 backdrop-blur">
                <Shield className="w-4 h-4 text-success-400" />
                <span className="text-white/90 text-sm font-medium">Secure</span>
              </div>
            </div>
            
            <p className="text-5xl font-bold text-white tracking-tight mb-2">
              {formatCurrency(balance)}
            </p>
            <p className="text-primary-200 text-sm">Last updated: {new Date().toLocaleTimeString()}</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="space-y-4">
          <div className="stat-card">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-success-100 rounded-lg flex items-center justify-center">
                <ArrowDownRight className="w-4 h-4 text-success-600" />
              </div>
              <span className="text-sm text-slate-500">Total Received</span>
            </div>
            <p className="stat-value text-success-600">{formatCurrency(balance * 0.6)}</p>
          </div>
          
          <div className="stat-card">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-danger-100 rounded-lg flex items-center justify-center">
                <ArrowUpRight className="w-4 h-4 text-danger-600" />
              </div>
              <span className="text-sm text-slate-500">Total Sent</span>
            </div>
            <p className="stat-value text-danger-600">{formatCurrency(balance * 0.4)}</p>
          </div>
        </div>
      </div>

      {/* Alert Messages */}
      {message && (
        <div className={`alert-${message.type === 'success' ? 'success' : 'danger'}`}>
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{message.text}</p>
          <button onClick={() => setMessage(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Action Tabs */}
      <div className="card">
        <div className="border-b border-slate-200">
          <div className="tabs m-2">
            {([
              { id: 'transfer', label: 'Send Money', icon: Send },
              { id: 'deposit', label: 'Add Funds', icon: Plus },
              { id: 'search', label: 'Search', icon: Search },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={activeTab === tab.id ? 'tab-active flex items-center gap-2' : 'tab-inactive flex items-center gap-2'}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="card-body">
          {/* Transfer Form */}
          {activeTab === 'transfer' && (
            <div className="max-w-2xl">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-1">Send Money</h3>
                <p className="text-sm text-slate-500">Transfer funds to another account instantly</p>
              </div>
              
              <form onSubmit={handleTransfer} className="space-y-5">
                <div>
                  <label className="form-label">Recipient User ID</label>
                  <input
                    type="text"
                    value={transferData.toUserId}
                    onChange={(e) => setTransferData({ ...transferData, toUserId: e.target.value })}
                    className="input"
                    placeholder="Enter recipient's user ID"
                    required
                  />
                </div>
                
                <div>
                  <label className="form-label">Amount</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={transferData.amount}
                      onChange={(e) => setTransferData({ ...transferData, amount: e.target.value })}
                      className="input pl-8"
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <p className="form-hint">Minimum transfer amount: $1.00</p>
                </div>
                
                <div>
                  <label className="form-label">Description <span className="text-slate-400">(Optional)</span></label>
                  <input
                    type="text"
                    value={transferData.description}
                    onChange={(e) => setTransferData({ ...transferData, description: e.target.value })}
                    className="input"
                    placeholder="Payment for..."
                    maxLength={100}
                  />
                </div>

                <div className="bg-slate-50 rounded-lg p-4 flex items-start gap-3">
                  <Clock className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-slate-600">
                    <p className="font-medium text-slate-700">Processing Time</p>
                    <p>Transfers are typically processed within 2 seconds. A 0.1% fee applies.</p>
                  </div>
                </div>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary py-3"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Send className="w-5 h-5" />
                      Send Money
                    </span>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Deposit Form */}
          {activeTab === 'deposit' && (
            <div className="max-w-2xl">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-1">Add Funds</h3>
                <p className="text-sm text-slate-500">Deposit money into your wallet</p>
              </div>
              
              <form onSubmit={handleDeposit} className="space-y-5">
                <div>
                  <label className="form-label">Amount</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="input pl-8"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  {[50, 100, 250, 500].map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setDepositAmount(amount.toString())}
                      className="py-2 px-4 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:border-primary-500 hover:text-primary-600 transition-colors"
                    >
                      ${amount}
                    </button>
                  ))}
                </div>

                <div className="bg-slate-50 rounded-lg p-4 flex items-start gap-3">
                  <CreditCard className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-slate-600">
                    <p className="font-medium text-slate-700">Payment Method</p>
                    <p>Funds will be added instantly to your wallet balance.</p>
                  </div>
                </div>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-success py-3"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Plus className="w-5 h-5" />
                      Add Funds
                    </span>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Search Form */}
          {activeTab === 'search' && (
            <div className="max-w-2xl">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-1">Search Wallets</h3>
                <p className="text-sm text-slate-500">Advanced wallet search with JSON queries</p>
              </div>
              
              <form onSubmit={handleSearch} className="space-y-5">
                <div>
                  <label className="form-label">Query (JSON format)</label>
                  <textarea
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input font-mono min-h-[120px] resize-none"
                    placeholder={'{\n  "balance": { "$gte": 1000 }\n}'}
                  />
                  <p className="form-hint">Enter a valid MongoDB query object</p>
                </div>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary py-3"
                >
                  {loading ? 'Searching...' : 'Search Wallets'}
                </button>
              </form>

              {searchResults.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-semibold text-slate-900 mb-3">Search Results ({searchResults.length})</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {searchResults.map((wallet, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <div>
                          <p className="font-mono text-sm text-slate-600">User ID: {wallet.userId}</p>
                          <p className="text-xs text-slate-400">{wallet.currency}</p>
                        </div>
                        <p className="font-semibold text-slate-900">{formatCurrency(wallet.balance)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && transactionDetails && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-premium max-w-md w-full p-8 animate-slide-up">
            <div className="text-center">
              <div className="w-20 h-20 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-success-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Success!</h3>
              <p className="text-slate-500 mb-6">
                Your {transactionDetails.type.toLowerCase()} has been processed successfully.
              </p>
              
              <div className="bg-slate-50 rounded-xl p-4 mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-500">Amount</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(transactionDetails.amount)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">New Balance</span>
                  <span className="font-semibold text-success-600">{formatCurrency(transactionDetails.balance || balance)}</span>
                </div>
              </div>

              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full btn-primary py-3"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Wallet;

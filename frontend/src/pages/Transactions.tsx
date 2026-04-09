import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  History, 
  Search, 
  TrendingUp, 
  BarChart3, 
  Download,
  Filter,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

const Transactions = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<any[]>([]);
  const [searchType, setSearchType] = useState('');
  const [searchStatus, setSearchStatus] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [transactionDetails, setTransactionDetails] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'search' | 'stats'>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/transactions`);
      setTransactions(response.data);
      setFilteredTransactions(response.data);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const params = new URLSearchParams();
      if (searchType) params.append('type', searchType);
      if (searchStatus) params.append('status', searchStatus);

      const response = await axios.get(`${API_URL}/api/transactions/search?${params}`);
      setFilteredTransactions(response.data);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactionById = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.get(`${API_URL}/api/transactions/${transactionId}`);
      setTransactionDetails(response.data);
    } catch (error) {
      console.error('Failed to fetch transaction:', error);
      setTransactionDetails(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await axios.get(`${API_URL}/api/transactions/stats/summary?${params}`);
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
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

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="badge badge-success">Completed</span>;
      case 'pending':
        return <span className="badge badge-warning">Pending</span>;
      case 'failed':
        return <span className="badge badge-danger">Failed</span>;
      default:
        return <span className="badge badge-info">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Transaction History</h1>
            <p className="page-subtitle">View and analyze your financial activity</p>
          </div>
          <button className="btn-secondary gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <p className="stat-label">Total Transactions</p>
          <p className="stat-value">{transactions.length}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Completed</p>
          <p className="stat-value text-success-600">
            {transactions.filter(t => t.status === 'completed').length}
          </p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Pending</p>
          <p className="stat-value text-warning-600">
            {transactions.filter(t => t.status === 'pending').length}
          </p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Total Volume</p>
          <p className="stat-value">
            {formatCurrency(transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0))}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {([
          { id: 'list', label: 'All Transactions', icon: History },
          { id: 'search', label: 'Advanced Search', icon: Search },
          { id: 'stats', label: 'Analytics', icon: BarChart3 },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setCurrentPage(1); }}
            className={activeTab === tab.id ? 'tab-active flex items-center gap-2' : 'tab-inactive flex items-center gap-2'}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Transaction List */}
      {activeTab === 'list' && (
        <div className="card">
          {transactions.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <History className="w-10 h-10 text-slate-400" />
              </div>
              <p className="text-slate-500 font-medium text-lg">No transactions found</p>
              <p className="text-sm text-slate-400 mt-1">Start by making your first transfer</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Transaction</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th className="text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTransactions.map((transaction) => {
                      const isSent = transaction.from_user_id === user?.id;
                      return (
                        <tr key={transaction.id} className="group">
                          <td>
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                isSent ? 'bg-danger-100' : 'bg-success-100'
                              }`}>
                                {isSent ? (
                                  <ArrowUpRight className="w-5 h-5 text-danger-600" />
                                ) : (
                                  <ArrowDownRight className="w-5 h-5 text-success-600" />
                                )}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-900">
                                  {isSent ? 'Sent' : 'Received'}
                                </p>
                                <p className="text-xs text-slate-500">ID: {transaction.id}</p>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="capitalize text-slate-700">{transaction.type}</span>
                          </td>
                          <td>{getStatusBadge(transaction.status)}</td>
                          <td>
                            <div className="text-sm">
                              <p className="text-slate-900">
                                {new Date(transaction.created_at).toLocaleDateString()}
                              </p>
                              <p className="text-slate-500 text-xs">
                                {new Date(transaction.created_at).toLocaleTimeString()}
                              </p>
                            </div>
                          </td>
                          <td className="text-right">
                            <p className={`font-semibold ${isSent ? 'text-danger-600' : 'text-success-600'}`}>
                              {isSent ? '-' : '+'}{formatCurrency(parseFloat(transaction.amount))}
                            </p>
                            {transaction.tax_amount > 0 && (
                              <p className="text-xs text-slate-400">
                                Fee: {formatCurrency(parseFloat(transaction.tax_amount))}
                              </p>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
                  <p className="text-sm text-slate-500">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} of {filteredTransactions.length} transactions
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-sm font-medium text-slate-700">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Search */}
      {activeTab === 'search' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filter Transactions
              </h3>
            </div>
            <div className="card-body">
              <form onSubmit={handleSearch} className="space-y-4">
                <div>
                  <label className="form-label">Transaction Type</label>
                  <select
                    value={searchType}
                    onChange={(e) => setSearchType(e.target.value)}
                    className="input"
                  >
                    <option value="">All Types</option>
                    <option value="transfer">Transfer</option>
                    <option value="deposit">Deposit</option>
                    <option value="withdrawal">Withdrawal</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Status</label>
                  <select
                    value={searchStatus}
                    onChange={(e) => setSearchStatus(e.target.value)}
                    className="input"
                  >
                    <option value="">All Statuses</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary"
                >
                  {loading ? 'Searching...' : 'Apply Filters'}
                </button>
              </form>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-slate-900">Find by ID</h3>
            </div>
            <div className="card-body">
              <form onSubmit={fetchTransactionById} className="space-y-4">
                <div>
                  <label className="form-label">Transaction ID</label>
                  <input
                    type="number"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    className="input"
                    placeholder="Enter transaction ID"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-secondary"
                >
                  {loading ? 'Fetching...' : 'Search'}
                </button>
              </form>

              {transactionDetails && (
                <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <h4 className="font-semibold text-slate-900 mb-3">Transaction Details</h4>
                  <div className="space-y-2 text-sm">
                    {Object.entries(transactionDetails).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-slate-500 capitalize">{key.replace(/_/g, ' ')}</span>
                        <span className="font-mono text-slate-900">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      {activeTab === 'stats' && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Transaction Analytics
            </h3>
          </div>
          <div className="card-body">
            <form onSubmit={fetchStats} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div>
                <label className="form-label">Start Date</label>
                <div className="input-group">
                  <Calendar className="absolute left-3.5 text-slate-400 w-5 h-5" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="input pl-11"
                  />
                </div>
              </div>
              <div>
                <label className="form-label">End Date</label>
                <div className="input-group">
                  <Calendar className="absolute left-3.5 text-slate-400 w-5 h-5" />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="input pl-11"
                  />
                </div>
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary"
                >
                  {loading ? 'Calculating...' : 'Generate Report'}
                </button>
              </div>
            </form>

            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-primary-50 rounded-xl p-6 text-center">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CreditCard className="w-6 h-6 text-primary-600" />
                  </div>
                  <p className="text-sm text-slate-600 mb-1">Total Transactions</p>
                  <p className="text-3xl font-bold text-primary-700">{stats.total_count || 0}</p>
                </div>
                <div className="bg-success-50 rounded-xl p-6 text-center">
                  <div className="w-12 h-12 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <TrendingUp className="w-6 h-6 text-success-600" />
                  </div>
                  <p className="text-sm text-slate-600 mb-1">Total Amount</p>
                  <p className="text-3xl font-bold text-success-700">
                    {formatCurrency(parseFloat(stats.total_amount || 0))}
                  </p>
                </div>
                <div className="bg-accent-50 rounded-xl p-6 text-center">
                  <div className="w-12 h-12 bg-accent-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <BarChart3 className="w-6 h-6 text-accent-600" />
                  </div>
                  <p className="text-sm text-slate-600 mb-1">Average Amount</p>
                  <p className="text-3xl font-bold text-accent-700">
                    {formatCurrency(parseFloat(stats.avg_amount || 0))}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Shield, 
  Users, 
  Wallet, 
  History, 
  Search, 
  AlertCircle,
  Download,
  RefreshCw,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Activity,
  Settings
} from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

const Admin = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'wallets' | 'transactions' | 'search'>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`${API_URL}/api/admin/users`);
      setUsers(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const fetchWallets = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`${API_URL}/api/admin/wallets`);
      setWallets(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch wallets');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`${API_URL}/api/admin/transactions`);
      setTransactions(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(
        `${API_URL}/api/auth/users/search?email=${encodeURIComponent(searchEmail)}`
      );
      setSearchResults(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const loadData = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setCurrentPage(1);
    switch (tab) {
      case 'users':
        fetchUsers();
        break;
      case 'wallets':
        fetchWallets();
        break;
      case 'transactions':
        fetchTransactions();
        break;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <span className="badge badge-premium">Admin</span>;
      case 'user':
        return <span className="badge badge-info">User</span>;
      default:
        return <span className="badge">{role}</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="badge badge-success flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Completed</span>;
      case 'pending':
        return <span className="badge badge-warning flex items-center gap-1"><Activity className="w-3 h-3" /> Pending</span>;
      case 'failed':
        return <span className="badge badge-danger flex items-center gap-1"><XCircle className="w-3 h-3" /> Failed</span>;
      default:
        return <span className="badge badge-info">{status}</span>;
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="card p-8 text-center">
        <div className="w-20 h-20 bg-danger-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="w-10 h-10 text-danger-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h2>
        <p className="text-slate-500">You don't have permission to access the admin panel.</p>
      </div>
    );
  }

  const getPaginatedData = (data: any[]) => {
    const start = (currentPage - 1) * itemsPerPage;
    return data.slice(start, start + itemsPerPage);
  };

  const getTotalPages = (data: any[]) => Math.ceil(data.length / itemsPerPage);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title flex items-center gap-3">
              <Shield className="w-8 h-8 text-primary-600" />
              Admin Dashboard
            </h1>
            <p className="page-subtitle">System management and monitoring</p>
          </div>
          <div className="flex gap-3">
            <button className="btn-secondary gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </button>
            <button className="btn-primary gap-2">
              <Download className="w-4 h-4" />
              Export Report
            </button>
          </div>
        </div>
      </div>

      {/* System Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-primary-600" />
            </div>
            <span className="text-xs font-medium text-success-600 bg-success-100 px-2 py-1 rounded-full">+12%</span>
          </div>
          <p className="stat-label">Total Users</p>
          <p className="stat-value">{users.length || '-'}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center">
              <Wallet className="w-5 h-5 text-success-600" />
            </div>
            <span className="text-xs font-medium text-success-600 bg-success-100 px-2 py-1 rounded-full">+8.5%</span>
          </div>
          <p className="stat-label">Total Wallets</p>
          <p className="stat-value">{wallets.length || '-'}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-accent-100 rounded-lg flex items-center justify-center">
              <History className="w-5 h-5 text-accent-600" />
            </div>
            <span className="text-xs font-medium text-success-600 bg-success-100 px-2 py-1 rounded-full">+24%</span>
          </div>
          <p className="stat-label">Transactions</p>
          <p className="stat-value">{transactions.length || '-'}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <p className="stat-label">System Status</p>
          <p className="stat-value text-success-600">Healthy</p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert-danger">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
          <button onClick={() => setError('')} className="ml-auto hover:text-danger-800">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        {([
          { id: 'users', label: 'Users', icon: Users },
          { id: 'wallets', label: 'Wallets', icon: Wallet },
          { id: 'transactions', label: 'Transactions', icon: History },
          { id: 'search', label: 'Search', icon: Search },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            onClick={() => loadData(tab.id)}
            className={activeTab === tab.id ? 'tab-active flex items-center gap-2' : 'tab-inactive flex items-center gap-2'}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5" />
                User Management
              </h3>
              <p className="text-sm text-slate-500">Manage system users and permissions</p>
            </div>
            <button 
              onClick={fetchUsers}
              className="btn-secondary btn-sm gap-2"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                <p className="text-slate-500 mt-2">Loading users...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No users found</p>
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Phone</th>
                    <th>Created</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {getPaginatedData(users).map((user) => (
                    <tr key={user._id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center text-white font-semibold">
                            {(user.firstName?.[0] || user.email[0]).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">
                              {user.firstName} {user.lastName}
                            </p>
                            <p className="text-sm text-slate-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>{getRoleBadge(user.role)}</td>
                      <td className="text-slate-600">{user.phone || '-'}</td>
                      <td className="text-slate-600">{formatDate(user.createdAt)}</td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-primary-600 transition-colors">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-danger-600 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {users.length > itemsPerPage && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
              <p className="text-sm text-slate-500">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, users.length)} of {users.length} users
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm font-medium text-slate-700">
                  Page {currentPage} of {getTotalPages(users)}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(getTotalPages(users), p + 1))}
                  disabled={currentPage === getTotalPages(users)}
                  className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Wallets Tab */}
      {activeTab === 'wallets' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                Wallet Overview
              </h3>
              <p className="text-sm text-slate-500">Monitor wallet balances and activity</p>
            </div>
            <button 
              onClick={fetchWallets}
              className="btn-secondary btn-sm gap-2"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                <p className="text-slate-500 mt-2">Loading wallets...</p>
              </div>
            ) : wallets.length === 0 ? (
              <div className="text-center py-12">
                <Wallet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No wallets found</p>
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>User ID</th>
                    <th>Balance</th>
                    <th>Currency</th>
                    <th>Last Updated</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {getPaginatedData(wallets).map((wallet) => (
                    <tr key={wallet._id}>
                      <td>
                        <div className="font-mono text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded inline-block">
                          {wallet.userId.substring(0, 12)}...
                        </div>
                      </td>
                      <td>
                        <p className={`font-semibold text-lg ${wallet.balance > 10000 ? 'text-success-600' : wallet.balance < 1000 ? 'text-warning-600' : 'text-slate-900'}`}>
                          {formatCurrency(wallet.balance)}
                        </p>
                      </td>
                      <td>
                        <span className="badge badge-info">{wallet.currency}</span>
                      </td>
                      <td className="text-slate-600">{formatDate(wallet.updatedAt)}</td>
                      <td className="text-right">
                        <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-primary-600 transition-colors">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {wallets.length > itemsPerPage && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
              <p className="text-sm text-slate-500">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, wallets.length)} of {wallets.length} wallets
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm font-medium text-slate-700">
                  Page {currentPage} of {getTotalPages(wallets)}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(getTotalPages(wallets), p + 1))}
                  disabled={currentPage === getTotalPages(wallets)}
                  className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5" />
                Transaction Log
              </h3>
              <p className="text-sm text-slate-500">View all system transactions</p>
            </div>
            <button 
              onClick={fetchTransactions}
              className="btn-secondary btn-sm gap-2"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                <p className="text-slate-500 mt-2">Loading transactions...</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12">
                <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No transactions found</p>
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>From</th>
                    <th>To</th>
                    <th>Amount</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {getPaginatedData(transactions).map((tx) => (
                    <tr key={tx.id}>
                      <td className="font-mono text-sm">#{tx.id}</td>
                      <td>
                        <div className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded truncate max-w-[120px]">
                          {tx.from_user_id.substring(0, 16)}...
                        </div>
                      </td>
                      <td>
                        <div className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded truncate max-w-[120px]">
                          {tx.to_user_id.substring(0, 16)}...
                        </div>
                      </td>
                      <td>
                        <p className="font-semibold">{formatCurrency(parseFloat(tx.amount))}</p>
                        {tx.tax_amount > 0 && (
                          <p className="text-xs text-slate-400">Fee: {formatCurrency(parseFloat(tx.tax_amount))}</p>
                        )}
                      </td>
                      <td>
                        <span className="capitalize text-slate-700">{tx.type}</span>
                      </td>
                      <td>{getStatusBadge(tx.status)}</td>
                      <td className="text-slate-600">{formatDate(tx.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {transactions.length > itemsPerPage && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
              <p className="text-sm text-slate-500">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, transactions.length)} of {transactions.length} transactions
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm font-medium text-slate-700">
                  Page {currentPage} of {getTotalPages(transactions)}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(getTotalPages(transactions), p + 1))}
                  disabled={currentPage === getTotalPages(transactions)}
                  className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search Tab */}
      {activeTab === 'search' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Search className="w-5 h-5" />
                Advanced User Search
              </h3>
              <p className="text-sm text-slate-500">Search users with custom queries</p>
            </div>
          </div>
          <div className="card-body">
            <form onSubmit={handleSearch} className="space-y-4 max-w-2xl">
              <div>
                <label className="form-label">Email Query</label>
                <div className="input-group">
                  <Filter className="absolute left-3.5 text-slate-400 w-5 h-5" />
                  <input
                    type="text"
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    className="input pl-11 font-mono"
                    placeholder="example@domain.com or {$regex: 'pattern'}"
                  />
                </div>
                <p className="form-hint">Enter an email address or MongoDB query operator</p>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      Search
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => { setSearchEmail(''); setSearchResults([]); }}
                  className="btn-secondary"
                >
                  Clear
                </button>
              </div>
            </form>

            {searchResults.length > 0 && (
              <div className="mt-8">
                <h4 className="font-semibold text-slate-900 mb-4">Search Results ({searchResults.length})</h4>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Email</th>
                        <th>Name</th>
                        <th>Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      {searchResults.map((user) => (
                        <tr key={user._id}>
                          <td className="font-mono text-xs">{user._id.substring(0, 12)}...</td>
                          <td className="font-medium">{user.email}</td>
                          <td>{user.firstName} {user.lastName}</td>
                          <td>{getRoleBadge(user.role)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;

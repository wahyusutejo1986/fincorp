import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock,
  Activity,
  CreditCard,
  ChevronRight
} from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

interface Stats {
  balance: number;
  totalSent: number;
  totalReceived: number;
  transactionCount: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    balance: 0,
    totalSent: 0,
    totalReceived: 0,
    transactionCount: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [balanceRes, transactionsRes] = await Promise.all([
        axios.get(`${API_URL}/api/wallet/balance`),
        axios.get(`${API_URL}/api/transactions`),
      ]);

      const balance = balanceRes.data.balance;
      const transactions = transactionsRes.data;

      const totalSent = transactions
        .filter((t: any) => t.from_user_id === user?.id)
        .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);

      const totalReceived = transactions
        .filter((t: any) => t.to_user_id === user?.id)
        .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);

      setStats({
        balance,
        totalSent,
        totalReceived,
        transactionCount: transactions.length,
      });

      setRecentTransactions(transactions.slice(0, 5));
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-64"></div>
        <div className="skeleton h-4 w-48"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-6">
              <div className="skeleton h-4 w-24 mb-2"></div>
              <div className="skeleton h-8 w-32"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">
          {getGreeting()}, {user?.firstName || user?.email?.split('@')[0]}!
        </h1>
        <p className="page-subtitle">
          Here's your financial overview for today
        </p>
      </div>

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Balance Card */}
        <div className="lg:col-span-2 card-premium p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur">
                  <Wallet className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-primary-200 text-sm font-medium">Total Balance</p>
                  <p className="text-white/60 text-xs">Available for transactions</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1 backdrop-blur">
                <div className="w-2 h-2 bg-success-400 rounded-full animate-pulse"></div>
                <span className="text-white/90 text-sm font-medium">Active</span>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-5xl font-bold text-white tracking-tight">
                {formatCurrency(stats.balance)}
              </p>
              <p className="text-primary-200 text-sm mt-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                <span>+2.4% from last month</span>
              </p>
            </div>

            <div className="flex gap-3">
              <button className="px-4 py-2 bg-white text-primary-700 rounded-lg font-semibold text-sm hover:bg-primary-50 transition-colors">
                Add Funds
              </button>
              <button className="px-4 py-2 bg-white/10 text-white rounded-lg font-semibold text-sm hover:bg-white/20 transition-colors backdrop-blur">
                Transfer
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className="card p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            {[
              { icon: ArrowUpRight, label: 'Send Money', color: 'text-primary-600', bg: 'bg-primary-100' },
              { icon: CreditCard, label: 'Pay Bills', color: 'text-success-600', bg: 'bg-success-100' },
              { icon: Activity, label: 'View Analytics', color: 'text-accent-600', bg: 'bg-accent-100' },
              { icon: Clock, label: 'Schedule Payment', color: 'text-slate-600', bg: 'bg-slate-100' },
            ].map((action, i) => (
              <button key={i} className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors group">
                <div className={`w-10 h-10 ${action.bg} rounded-lg flex items-center justify-center ${action.color}`}>
                  <action.icon className="w-5 h-5" />
                </div>
                <span className="flex-1 font-medium text-slate-700 text-left">{action.label}</span>
                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-danger-100 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-danger-600" />
            </div>
            <span className="stat-change-negative">
              <ArrowDownRight className="w-4 h-4" />
              12%
            </span>
          </div>
          <p className="stat-label">Total Sent</p>
          <p className="stat-value text-danger-600">{formatCurrency(stats.totalSent)}</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-success-600" />
            </div>
            <span className="stat-change-positive">
              <ArrowUpRight className="w-4 h-4" />
              8.2%
            </span>
          </div>
          <p className="stat-label">Total Received</p>
          <p className="stat-value text-success-600">{formatCurrency(stats.totalReceived)}</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-primary-600" />
            </div>
            <span className="stat-change-positive">
              <ArrowUpRight className="w-4 h-4" />
              24%
            </span>
          </div>
          <p className="stat-label">Transactions</p>
          <p className="stat-value">{stats.transactionCount.toLocaleString()}</p>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Recent Transactions</h2>
            <p className="text-sm text-slate-500">Your latest financial activity</p>
          </div>
          <button className="btn-secondary btn-sm">
            View All
          </button>
        </div>
        <div className="card-body p-0">
          {recentTransactions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Activity className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-500 font-medium">No transactions yet</p>
              <p className="text-sm text-slate-400 mt-1">Start by making your first transfer</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentTransactions.map((transaction) => {
                const isSent = transaction.from_user_id === user?.id;
                return (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-5 hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        isSent ? 'bg-danger-100' : 'bg-success-100'
                      }`}>
                        {isSent ? (
                          <ArrowUpRight className="w-6 h-6 text-danger-600" />
                        ) : (
                          <ArrowDownRight className="w-6 h-6 text-success-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">
                          {isSent ? 'Transfer Sent' : 'Transfer Received'}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <span>{new Date(transaction.created_at).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}</span>
                          <span>•</span>
                          <span className="capitalize">{transaction.type}</span>
                          <span>•</span>
                          <span className={`badge ${transaction.status === 'completed' ? 'badge-success' : transaction.status === 'pending' ? 'badge-warning' : 'badge-danger'}`}>
                            {transaction.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold text-lg ${isSent ? 'text-danger-600' : 'text-success-600'}`}>
                        {isSent ? '-' : '+'}{formatCurrency(parseFloat(transaction.amount))}
                      </p>
                      {transaction.tax_amount > 0 && (
                        <p className="text-xs text-slate-400">
                          Fee: {formatCurrency(parseFloat(transaction.tax_amount))}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

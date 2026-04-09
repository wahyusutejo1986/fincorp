import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Building2, Eye, EyeOff, ShieldCheck, Lock, Mail, User, Phone, CheckCircle } from 'lucide-react';

const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: 'user',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(formData);
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const passwordStrength = (password: string) => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  };

  const strength = passwordStrength(formData.password);
  const strengthText = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'][strength];
  const strengthColor = ['bg-danger-500', 'bg-danger-400', 'bg-warning-500', 'bg-success-400', 'bg-success-500'][strength];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-premium relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}></div>
        
        <div className="relative z-10 flex flex-col justify-center px-16">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center border border-white/20">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">FinCorp</h1>
              <p className="text-primary-200">Enterprise Banking Platform</p>
            </div>
          </div>
          
          <h2 className="text-4xl font-bold text-white mb-6 leading-tight">
            Start Your Financial<br />Journey Today
          </h2>
          <p className="text-lg text-primary-100 mb-8 max-w-md">
            Join thousands of enterprises managing their finances with our secure, comprehensive banking platform.
          </p>
          
          <div className="space-y-4">
            {[
              'Bank-grade security & encryption',
              'Real-time transaction monitoring',
              'Advanced analytics & reporting',
              '24/7 dedicated support'
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3 text-white/90">
                <CheckCircle className="w-5 h-5 text-accent-400 flex-shrink-0" />
                <span className="text-sm font-medium">{feature}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-primary-500/30 rounded-full blur-3xl"></div>
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-accent-500/20 rounded-full blur-3xl"></div>
      </div>

      {/* Right Side - Register Form */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-md py-8">
          <div className="text-center mb-8">
            <div className="lg:hidden flex items-center justify-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-premium rounded-xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <h1 className="text-xl font-bold text-slate-900">FinCorp</h1>
                <p className="text-xs text-slate-500">Enterprise Banking</p>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Create Account</h2>
            <p className="text-slate-500">Set up your enterprise banking profile</p>
          </div>

          <div className="card p-8">
            {error && (
              <div className="alert-danger mb-6">
                <div className="w-5 h-5 rounded-full bg-danger-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-danger-700 text-xs font-bold">!</span>
                </div>
                <p className="text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">First Name</label>
                  <div className="input-group">
                    <User className="absolute left-3.5 text-slate-400 w-5 h-5" />
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      className="input pl-11"
                      placeholder="John"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="form-label">Last Name</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="input"
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Email Address</label>
                <div className="input-group">
                  <Mail className="absolute left-3.5 text-slate-400 w-5 h-5" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="input pl-11"
                    placeholder="name@company.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Phone Number</label>
                <div className="input-group">
                  <Phone className="absolute left-3.5 text-slate-400 w-5 h-5" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="input pl-11"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Password</label>
                <div className="input-group">
                  <Lock className="absolute left-3.5 text-slate-400 w-5 h-5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="input pl-11 pr-11"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="input-icon right-3.5"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {formData.password && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className={`h-full ${strengthColor} transition-all duration-300`} style={{ width: `${(strength + 1) * 20}%` }}></div>
                      </div>
                      <span className="text-xs text-slate-500">{strengthText}</span>
                    </div>
                    <p className="text-xs text-slate-400">Use 8+ characters with uppercase, numbers & symbols</p>
                  </div>
                )}
              </div>

              <div>
                <label className="form-label">Account Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`cursor-pointer p-3 border rounded-lg transition-all ${formData.role === 'user' ? 'border-primary-500 bg-primary-50' : 'border-slate-200 hover:border-slate-300'}`}>
                    <input
                      type="radio"
                      name="role"
                      value="user"
                      checked={formData.role === 'user'}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <div className="text-center">
                      <User className={`w-6 h-6 mx-auto mb-1 ${formData.role === 'user' ? 'text-primary-600' : 'text-slate-400'}`} />
                      <span className={`text-sm font-medium ${formData.role === 'user' ? 'text-primary-700' : 'text-slate-600'}`}>Personal</span>
                    </div>
                  </label>
                  <label className={`cursor-pointer p-3 border rounded-lg transition-all ${formData.role === 'admin' ? 'border-primary-500 bg-primary-50' : 'border-slate-200 hover:border-slate-300'}`}>
                    <input
                      type="radio"
                      name="role"
                      value="admin"
                      checked={formData.role === 'admin'}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <div className="text-center">
                      <ShieldCheck className={`w-6 h-6 mx-auto mb-1 ${formData.role === 'admin' ? 'text-primary-600' : 'text-slate-400'}`} />
                      <span className={`text-sm font-medium ${formData.role === 'admin' ? 'text-primary-700' : 'text-slate-600'}`}>Business</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <input type="checkbox" required className="mt-1 rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
                <p className="text-sm text-slate-600">
                  I agree to the{' '}
                  <a href="#" className="text-primary-600 hover:text-primary-700 font-medium">Terms of Service</a>
                  {' '}and{' '}
                  <a href="#" className="text-primary-600 hover:text-primary-700 font-medium">Privacy Policy</a>
                  , and consent to receiving account-related communications.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-3 text-base"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating account...
                  </span>
                ) : (
                  'Create Account'
                )}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-slate-600">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-semibold">
              Sign in
            </Link>
          </p>

          <div className="mt-8 flex items-center justify-center gap-6 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>Secure SSL</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock className="w-4 h-4" />
              <span>256-bit Encryption</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;

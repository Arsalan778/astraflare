import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  UserIcon,
  EnvelopeIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  BuildingOfficeIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@hooks/useAuth';

const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { label: 'One uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { label: 'One lowercase letter', test: (v) => /[a-z]/.test(v) },
  { label: 'One number', test: (v) => /\d/.test(v) },
  { label: 'One special character', test: (v) => /[!@#$%^&*(),.?":{}|<>]/.test(v) },
];

export default function Register() {
  const { register, isLoading, error, registerSuccess, resetError, resetRegisterSuccess } = useAuth();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    organization: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    resetError();
    resetRegisterSuccess();
    return () => {
      resetError();
      resetRegisterSuccess();
    };
  }, [resetError, resetRegisterSuccess]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) resetError();
    if (localError) setLocalError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    const allPassed = PASSWORD_RULES.every((r) => r.test(form.password));
    if (!allPassed) {
      setLocalError('Password does not meet all requirements.');
      return;
    }

    const { confirmPassword, ...submitData } = form;
    register(submitData);
  };

  const passwordStrength = PASSWORD_RULES.filter((r) => r.test(form.password)).length;
  const strengthPercent = (passwordStrength / PASSWORD_RULES.length) * 100;
  const strengthColor =
    strengthPercent <= 40
      ? 'bg-red-500'
      : strengthPercent <= 70
      ? 'bg-yellow-500'
      : 'bg-green-500';

  // After registration the user is logged in — redirect to dashboard
  if (registerSuccess) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-950 px-4 py-12">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-primary-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/3 w-96 h-96 bg-fire-500/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        className="w-full max-w-lg relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-fire-600 mb-4"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
          >
            <img src="/favicon.svg" alt="AstraFlare" className="w-10 h-10" />
          </motion.div>
          <h1 className="text-3xl font-display font-bold text-fire-gradient">
            Join AstraFlare
          </h1>
          <p className="text-dark-400 mt-2">Create your wildfire intelligence account</p>
        </div>

        {/* Form */}
        <div className="glass-panel p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Errors */}
            {(error || localError) && (
              <motion.div
                className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {localError || error}
              </motion.div>
            )}

            {/* Name Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="input-label">
                  First Name
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required
                    value={form.firstName}
                    onChange={handleChange}
                    placeholder="John"
                    className="input-field pl-11"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="lastName" className="input-label">
                  Last Name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  value={form.lastName}
                  onChange={handleChange}
                  placeholder="Doe"
                  className="input-field"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="input-label">
                Email Address
              </label>
              <div className="relative">
                <EnvelopeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className="input-field pl-11"
                />
              </div>
            </div>

            {/* Organization */}
            <div>
              <label htmlFor="organization" className="input-label">
                Organization{' '}
                <span className="text-dark-500 font-normal">(optional)</span>
              </label>
              <div className="relative">
                <BuildingOfficeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                <input
                  id="organization"
                  name="organization"
                  type="text"
                  value={form.organization}
                  onChange={handleChange}
                  placeholder="Fire Department, Research Lab..."
                  className="input-field pl-11"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="input-label">
                Password
              </label>
              <div className="relative">
                <LockClosedIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="input-field pl-11 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-200 transition-colors"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* Strength Bar */}
              {form.password && (
                <div className="mt-2">
                  <div className="h-1.5 bg-dark-700 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${strengthColor}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${strengthPercent}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-1 mt-2">
                    {PASSWORD_RULES.map((rule, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center gap-1.5 text-xs ${
                          rule.test(form.password)
                            ? 'text-green-400'
                            : 'text-dark-500'
                        }`}
                      >
                        <CheckCircleIcon className="w-3.5 h-3.5 flex-shrink-0" />
                        {rule.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="input-label">
                Confirm Password
              </label>
              <div className="relative">
                <LockClosedIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  required
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="input-field pl-11 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-200 transition-colors"
                >
                  {showConfirm ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
              {form.confirmPassword &&
                form.password !== form.confirmPassword && (
                  <p className="text-red-400 text-xs mt-1">
                    Passwords do not match.
                  </p>
                )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={
                isLoading ||
                !form.firstName ||
                !form.email ||
                !form.password ||
                !form.confirmPassword
              }
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-dark-700" />
            <span className="text-dark-500 text-xs uppercase tracking-wider">
              or
            </span>
            <div className="flex-1 h-px bg-dark-700" />
          </div>

          {/* Login CTA */}
          <p className="text-center text-dark-400 text-sm">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-primary-400 font-semibold hover:text-primary-300 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>

        <p className="text-center text-dark-600 text-xs mt-6">
          © {new Date().getFullYear()} AstraFlare. AI-Powered Wildfire Intelligence.
        </p>
      </motion.div>
    </div>
  );
}
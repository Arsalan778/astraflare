import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import authAPI from '@api/auth';

export default function VerifyEmail() {
  const { token } = useParams();
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link. No token provided.');
      return;
    }

    verifyToken();
  }, [token]);

  const verifyToken = async () => {
    setStatus('loading');
    try {
      const data = await authAPI.verifyEmail(token);
      setStatus('success');
      setMessage(data.message || 'Your email has been verified successfully!');
    } catch (err) {
      setStatus('error');
      setMessage(
        err.response?.data?.message ||
          'Verification failed. The link may have expired or is invalid.'
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-950 px-4">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-primary-500/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        className="w-full max-w-md relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="glass-panel p-10 text-center">
          {/* Loading */}
          {status === 'loading' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <ArrowPathIcon className="w-16 h-16 text-primary-400 mx-auto mb-4 animate-spin" />
              <h2 className="text-xl font-bold text-white mb-2">
                Verifying Your Email
              </h2>
              <p className="text-dark-400">
                Please wait while we confirm your email address...
              </p>
            </motion.div>
          )}

          {/* Success */}
          {status === 'success' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.15 }}
              >
                <CheckCircleIcon className="w-20 h-20 text-green-400 mx-auto mb-4" />
              </motion.div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Email Verified!
              </h2>
              <p className="text-dark-400 mb-6">{message}</p>
              <Link to="/login" className="btn-primary inline-block">
                Continue to Login
              </Link>
            </motion.div>
          )}

          {/* Error */}
          {status === 'error' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.15 }}
              >
                <XCircleIcon className="w-20 h-20 text-red-400 mx-auto mb-4" />
              </motion.div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Verification Failed
              </h2>
              <p className="text-dark-400 mb-6">{message}</p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={verifyToken}
                  className="btn-secondary flex items-center justify-center gap-2 w-full"
                >
                  <ArrowPathIcon className="w-4 h-4" />
                  Try Again
                </button>
                <Link
                  to="/login"
                  className="text-primary-400 text-sm hover:text-primary-300 transition-colors"
                >
                  Back to Login
                </Link>
              </div>
            </motion.div>
          )}
        </div>

        <p className="text-center text-dark-600 text-xs mt-6">
          © {new Date().getFullYear()} AstraFlare. AI-Powered Wildfire Intelligence.
        </p>
      </motion.div>
    </div>
  );
}
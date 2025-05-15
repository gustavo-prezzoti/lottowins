import React, { useState, useEffect } from 'react';
import Button from './Button';
import { Eye, EyeOff } from 'lucide-react';

interface ChangePasswordModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (currentPassword: string, newPassword: string) => void;
  isLoading?: boolean;
  error?: string | null;
}

function getPasswordStrength(password: string): 'weak' | 'medium' | 'strong' {
  if (password.length < 6) return 'weak';
  if (/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/.test(password)) return 'strong';
  if (/^(?=.*[a-zA-Z])(?=.*\d).{6,}$/.test(password)) return 'medium';
  return 'weak';
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ open, onClose, onSave, isLoading: isLoadingProp, error: errorProp }) => {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [touched, setTouched] = useState({ current: false, next: false, confirm: false });
  const [error, setError] = useState('');
  const [isLoadingInternal, setIsLoadingInternal] = useState(false);
  const isLoading = isLoadingProp !== undefined ? isLoadingProp : isLoadingInternal;
  const errorMsg = errorProp !== undefined ? errorProp : error;
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (open) {
      setCurrent('');
      setNext('');
      setConfirm('');
      setTouched({ current: false, next: false, confirm: false });
      setError('');
      setIsLoadingInternal(false);
    }
  }, [open]);

  const strength = getPasswordStrength(next);
  const strengthLabel = strength === 'strong' ? 'Strong' : strength === 'medium' ? 'Medium' : 'Weak';
  const strengthColor = strength === 'strong' ? 'bg-green-500' : strength === 'medium' ? 'bg-yellow-500' : 'bg-red-500';

  const handleSave = () => {
    if (!current) {
      setError('Current password is required.');
      setTouched(t => ({ ...t, current: true }));
      return;
    }
    if (strength === 'weak') {
      setError('Password is too weak.');
      setTouched(t => ({ ...t, next: true }));
      return;
    }
    if (next !== confirm) {
      setError('Passwords do not match.');
      setTouched(t => ({ ...t, confirm: true }));
      return;
    }
    setError('');
    if (isLoadingProp === undefined) setIsLoadingInternal(true);
    onSave(current, next);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-2 relative">
        <button 
          className="absolute top-3 right-3 text-gray-500 hover:text-accent text-2xl" 
          onClick={onClose}
          disabled={isLoading}
        >
          &times;
        </button>
        <h2 className="text-lg font-bold mb-6 text-center">Change Password</h2>
        <form onSubmit={e => { e.preventDefault(); handleSave(); }}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-text-dark mb-1">Current Password</label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                className={`w-full px-4 py-2 rounded-lg border ${touched.current && !current ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-accent text-base`}
                value={current}
                onChange={e => setCurrent(e.target.value)}
                onBlur={() => setTouched(t => ({ ...t, current: true }))}
                placeholder="Current password"
                autoFocus
                disabled={isLoading}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted"
                onClick={() => setShowCurrent((v) => !v)}
                tabIndex={-1}
                disabled={isLoading}
              >
                {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {touched.current && !current && (
              <p className="text-xs text-red-500 mt-1">Current password is required.</p>
            )}
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-text-dark mb-1">New Password</label>
            <div className="relative">
              <input
                type={showNext ? 'text' : 'password'}
                className={`w-full px-4 py-2 rounded-lg border ${touched.next && strength === 'weak' ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-accent text-base`}
                value={next}
                onChange={e => setNext(e.target.value)}
                onBlur={() => setTouched(t => ({ ...t, next: true }))}
                placeholder="New password"
                disabled={isLoading}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted"
                onClick={() => setShowNext((v) => !v)}
                tabIndex={-1}
                disabled={isLoading}
              >
                {showNext ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className={`w-3 h-3 rounded-full ${strengthColor}`}></div>
              <span className={`text-xs font-semibold ${strength === 'strong' ? 'text-green-600' : strength === 'medium' ? 'text-yellow-600' : 'text-red-600'}`}>{strengthLabel} password</span>
            </div>
            {touched.next && strength === 'weak' && (
              <p className="text-xs text-red-500 mt-1">Password is too weak.</p>
            )}
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-text-dark mb-1">Confirm New Password</label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                className={`w-full px-4 py-2 rounded-lg border ${touched.confirm && next !== confirm ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-accent text-base`}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                onBlur={() => setTouched(t => ({ ...t, confirm: true }))}
                placeholder="Confirm new password"
                disabled={isLoading}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted"
                onClick={() => setShowConfirm((v) => !v)}
                tabIndex={-1}
                disabled={isLoading}
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {touched.confirm && next !== confirm && (
              <p className="text-xs text-red-500 mt-1">Passwords do not match.</p>
            )}
          </div>
          {errorMsg && <div className="text-red-500 text-sm mb-3 text-center">{errorMsg}</div>}
          <div className="flex gap-3 mt-6">
            <Button 
              variant="outline" 
              className="flex-1 py-2" 
              type="button" 
              onClick={onClose} 
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              className="flex-1 py-2" 
              type="submit" 
              disabled={isLoading || !current || strength === 'weak' || next !== confirm}
              isLoading={isLoading}
            >
              Save
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordModal; 
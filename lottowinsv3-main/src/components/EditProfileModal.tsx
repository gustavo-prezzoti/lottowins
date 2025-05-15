import React, { useState, useEffect } from 'react';
import Button from './Button';

interface EditProfileModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (name: string, email: string) => void;
  initialName: string;
  initialEmail: string;
  isLoading?: boolean;
  error?: string | null;
}

const validateEmail = (email: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const EditProfileModal: React.FC<EditProfileModalProps> = ({ open, onClose, onSave, initialName, initialEmail, isLoading: isLoadingProp, error: errorProp }) => {
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState<{ name: boolean; email: boolean }>({ name: false, email: false });
  const [isLoadingInternal, setIsLoadingInternal] = useState(false);
  const isLoading = isLoadingProp !== undefined ? isLoadingProp : isLoadingInternal;
  const errorMsg = errorProp !== undefined ? errorProp : error;

  useEffect(() => {
    if (open) {
      setName(initialName);
      setEmail(initialEmail);
      setError('');
      setTouched({ name: false, email: false });
      setIsLoadingInternal(false);
    }
  }, [open, initialName, initialEmail]);

  const handleSave = () => {
    if (!name.trim()) {
      setError('Name is required.');
      setTouched(t => ({ ...t, name: true }));
      return;
    }
    if (!validateEmail(email)) {
      setError('Please enter a valid email.');
      setTouched(t => ({ ...t, email: true }));
      return;
    }
    setError('');
    if (isLoadingProp === undefined) setIsLoadingInternal(true);
    onSave(name.trim(), email.trim());
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
        <h2 className="text-lg font-bold mb-6 text-center">Edit Profile</h2>
        <form onSubmit={e => { e.preventDefault(); handleSave(); }}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-text-dark mb-1">Name</label>
            <input
              type="text"
              className={`w-full px-4 py-2 rounded-lg border ${touched.name && !name.trim() ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-accent text-base`}
              value={name}
              onChange={e => setName(e.target.value)}
              onBlur={() => setTouched(t => ({ ...t, name: true }))}
              placeholder="Your name"
              autoFocus
              disabled={isLoading}
            />
            {touched.name && !name.trim() && (
              <p className="text-xs text-red-500 mt-1">Name is required.</p>
            )}
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-text-dark mb-1">Email</label>
            <input
              type="email"
              className={`w-full px-4 py-2 rounded-lg border ${touched.email && !validateEmail(email) ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-accent text-base`}
              value={email}
              onChange={e => setEmail(e.target.value)}
              onBlur={() => setTouched(t => ({ ...t, email: true }))}
              placeholder="you@email.com"
              disabled={isLoading}
            />
            {touched.email && !validateEmail(email) && (
              <p className="text-xs text-red-500 mt-1">Please enter a valid email.</p>
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
              disabled={isLoading || !name.trim() || !validateEmail(email)}
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

export default EditProfileModal; 
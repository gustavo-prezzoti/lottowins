import React, { useRef } from 'react';
import { Camera } from 'lucide-react';

interface AvatarUploadProps {
  name: string;
  image?: string | null;
  onFileSelected: (file: File) => void;
  size?: number; // px
}

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const AvatarUpload: React.FC<AvatarUploadProps> = ({ name, image, onFileSelected, size = 128 }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelected(e.target.files[0]);
    }
  };

  return (
    <div
      className="relative group cursor-pointer"
      style={{ width: size, height: size }}
      onClick={handleClick}
      tabIndex={0}
      role="button"
      aria-label="Change profile photo"
    >
      {image ? (
        <img
          src={image ?? ''}
          alt={name}
          className="w-full h-full rounded-full object-cover border-4 border-accent/30 shadow-lg"
          onError={e => {
            e.currentTarget.style.display = 'none';
            
            const parent = e.currentTarget.parentElement;
            if (parent && !parent.querySelector('.avatar-initials')) {
              const initialsEl = document.createElement('div');
              initialsEl.className = 'avatar-initials w-full h-full rounded-full flex items-center justify-center bg-red-600/70 text-white text-3xl font-bold absolute top-0 left-0';
              initialsEl.textContent = getInitials(name);
              parent.appendChild(initialsEl);
            }
          }}
        />
      ) : (
        <div
          className="w-full h-full rounded-full flex items-center justify-center bg-red-600/70 text-white text-3xl font-bold select-none border-4 border-accent/30 shadow-lg"
        >
          {getInitials(name)}
        </div>
      )}
      {/* Overlay */}
      <div
        className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity"
        style={{ pointerEvents: 'none' }}
      >
        <Camera size={40} className="text-white/80" />
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        tabIndex={-1}
      />
    </div>
  );
};

export default AvatarUpload; 
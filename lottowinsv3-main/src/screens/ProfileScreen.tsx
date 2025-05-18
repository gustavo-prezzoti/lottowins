import React, { useState, useEffect } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import AvatarUpload from '../components/AvatarUpload';
import AvatarCropModal from '../components/AvatarCropModal';
import EditProfileModal from '../components/EditProfileModal';
import ChangePasswordModal from '../components/ChangePasswordModal';
import { useWindowSize } from '../hooks/useWindowSize';
import { LogOut, Trash2, User, Mail, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import { useToast } from '../components/Toast';

// Função para garantir que URLs de imagem usem HTTPS
function ensureHttps(url: string | null): string | null {
  if (!url) return null;
  return url.replace(/^http:\/\//i, 'https://');
}

const ProfileScreen: React.FC = () => {
  const { isMobile } = useWindowSize();
  const { user, logout, setUser } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [avatar, setAvatar] = useState<string | null>(user?.profile_photo ? ensureHttps(user.profile_photo) : null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  // Estado de nome e email editáveis
  const [name, setName] = useState(user?.name || 'User');
  const [email, setEmail] = useState(user?.email || 'user@example.com');
  // Estado dos modais
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isSavingPhoto, setIsSavingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null);

  // Update profile data when user changes
  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setAvatar(user.profile_photo ? ensureHttps(user.profile_photo) : null);
    }
  }, [user]);

  // Ao selecionar arquivo, abrir crop modal
  const handleAvatarFileSelected = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageToCrop(e.target?.result as string);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
  };

  // Após crop, salvar foto no backend
  const handleCropComplete = async (croppedImg: string) => {
    setIsSavingPhoto(true);
    setPhotoError(null);
    try {
      const updatedUser = await authService.updateProfilePhoto(croppedImg);
      setAvatar(updatedUser.profile_photo ? ensureHttps(updatedUser.profile_photo) : null);
      setUser(updatedUser);
      setCropModalOpen(false);
      setImageToCrop(null);
      showToast('Profile photo updated successfully!', { type: 'success' });
    } catch (err: unknown) {
      setPhotoError((err instanceof Error ? err.message : 'Failed to update profile photo'));
    } finally {
      setIsSavingPhoto(false);
    }
  };

  // Salvar edição de perfil
  const handleProfileSave = async (newName: string, newEmail: string) => {
    setIsSavingProfile(true);
    setProfileError(null);
    try {
      const updatedUser = await authService.updateProfile({ name: newName, email: newEmail });
      setName(updatedUser.name);
      setEmail(updatedUser.email);
      setUser(updatedUser);
      setEditProfileOpen(false);
      showToast('Profile updated successfully!', { type: 'success' });
    } catch (err: unknown) {
      setProfileError((err instanceof Error ? err.message : 'Failed to update profile'));
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Salvar troca de senha
  const handleChangePassword = async (currentPassword: string, newPassword: string) => {
    setIsChangingPassword(true);
    setChangePasswordError(null);
    try {
      await authService.changePassword(currentPassword, newPassword, newPassword);
      setChangePasswordOpen(false);
      showToast('Password changed successfully!', { type: 'success' });
    } catch (err: unknown) {
      setChangePasswordError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Mobile Layout
  const MobileProfile = () => (
    <div className="min-h-screen bg-primary">
      <main className="px-4 py-4">
        <Card className="flex flex-col items-center p-6 mb-6">
          <div className="mb-3">
            <AvatarUpload
              name={name}
              image={avatar}
              onFileSelected={handleAvatarFileSelected}
              size={96}
            />
          </div>
          <h2 className="text-xl font-bold text-text-dark mb-1">{name}</h2>
          <p className="text-text-muted text-sm mb-4 flex items-center gap-2"><Mail size={16} /> {email}</p>
          <Button className="w-full py-2 text-xs md:text-sm flex items-center justify-center gap-2 mb-2" onClick={() => setEditProfileOpen(true)}>Edit Profile</Button>
          <Button variant="outline" className="w-full py-2 text-xs md:text-sm flex items-center justify-center gap-2" onClick={() => setChangePasswordOpen(true)}><Lock size={16} />Change Password</Button>
        </Card>
        <Card className="p-4 mb-6 flex flex-col items-center">
          <h3 className="text-text-muted text-xs md:text-sm font-semibold mb-2 uppercase tracking-wider text-center">Account Actions</h3>
          <Button variant="outline" className="w-full max-w-xs py-2 text-xs md:text-sm flex items-center justify-center gap-2 mb-2" onClick={handleLogout}><LogOut size={15} />Logout</Button>
          <Button variant="secondary" className="w-full max-w-xs py-2 text-xs md:text-sm flex items-center justify-center gap-2"><Trash2 size={15} />Delete Account</Button>
        </Card>
        <AvatarCropModal
          open={cropModalOpen && !!imageToCrop}
          onClose={() => setCropModalOpen(false)}
          onCropComplete={handleCropComplete}
          imageSrc={imageToCrop}
          loading={isSavingPhoto}
          error={photoError}
        />
        <EditProfileModal
          open={editProfileOpen}
          onClose={() => setEditProfileOpen(false)}
          onSave={handleProfileSave}
          initialName={name}
          initialEmail={email}
          isLoading={isSavingProfile}
          error={profileError}
        />
        <ChangePasswordModal
          open={changePasswordOpen}
          onClose={() => setChangePasswordOpen(false)}
          onSave={handleChangePassword}
          isLoading={isChangingPassword}
          error={changePasswordError}
        />
      </main>
    </div>
  );

  // Desktop Layout
  const DesktopProfile = () => (
    <div className="min-h-screen bg-primary flex">
      <div className="flex-1 flex flex-col">
        <main className="pt-12 pb-20 px-12 flex-1">
          <div className="max-w-3xl mx-auto w-full">
            <Card className="flex flex-col md:flex-row items-center gap-10 p-12 mb-8 shadow-2xl rounded-2xl">
              <div>
                <AvatarUpload
                  name={name}
                  image={avatar}
                  onFileSelected={handleAvatarFileSelected}
                  size={160}
                />
              </div>
              <div className="flex-1">
                <h2 className="text-3xl font-bold text-text-dark mb-2 flex items-center gap-2"><User size={26} />{name}</h2>
                <p className="text-text-muted text-lg mb-4 flex items-center gap-2"><Mail size={20} /> {email}</p>
                <div className="flex gap-4 mb-2">
                  <Button className="py-2 text-xs md:text-sm flex items-center gap-2" onClick={() => setEditProfileOpen(true)}>Edit Profile</Button>
                  <Button variant="outline" className="py-2 text-xs md:text-sm flex items-center gap-2" onClick={() => setChangePasswordOpen(true)}><Lock size={18} />Change Password</Button>
                </div>
              </div>
            </Card>
            <Card className="p-8 flex flex-col items-center gap-2 shadow-md rounded-xl mb-10">
              <h3 className="text-text-muted text-xs md:text-sm font-semibold mb-4 uppercase tracking-wider text-center">Account Actions</h3>
              <div className="grid grid-cols-2 gap-3 w-full max-w-md">
                <Button variant="outline" className="w-full py-2 text-xs md:text-sm flex items-center justify-center gap-2" onClick={handleLogout}><LogOut size={15} />Logout</Button>
                <Button variant="secondary" className="w-full py-2 text-xs md:text-sm flex items-center justify-center gap-2"><Trash2 size={15} />Delete Account</Button>
              </div>
            </Card>
            <AvatarCropModal
              open={cropModalOpen && !!imageToCrop}
              onClose={() => setCropModalOpen(false)}
              onCropComplete={handleCropComplete}
              imageSrc={imageToCrop}
              loading={isSavingPhoto}
              error={photoError}
            />
            <EditProfileModal
              open={editProfileOpen}
              onClose={() => setEditProfileOpen(false)}
              onSave={handleProfileSave}
              initialName={name}
              initialEmail={email}
              isLoading={isSavingProfile}
              error={profileError}
            />
            <ChangePasswordModal
              open={changePasswordOpen}
              onClose={() => setChangePasswordOpen(false)}
              onSave={handleChangePassword}
              isLoading={isChangingPassword}
              error={changePasswordError}
            />
          </div>
        </main>
      </div>
    </div>
  );

  return isMobile ? <MobileProfile /> : <DesktopProfile />;
};

export default ProfileScreen; 
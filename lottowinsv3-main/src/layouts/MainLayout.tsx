import React from 'react';
import AppHeader from '../components/AppHeader';
import SideNavigation from '../components/SideNavigation';
import BottomNavigation from '../components/BottomNavigation';
import { useWindowSize } from '../hooks/useWindowSize';
import ProfileMenu from '../components/ProfileMenu';

const MainLayout: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
  const { isMobile } = useWindowSize();
  return (
    <div className="min-h-screen bg-primary flex">
      {!isMobile && <SideNavigation />}
      <div className="flex-1 flex flex-col">
        <AppHeader title={title} rightElement={<ProfileMenu />} />
        <main className={`${!isMobile ? 'lg:ml-80 pt-10 pb-16 px-8' : 'px-4 py-4'} flex-1`}>
          {children}
        </main>
        {isMobile && <BottomNavigation />}
      </div>
    </div>
  );
};

export default MainLayout; 
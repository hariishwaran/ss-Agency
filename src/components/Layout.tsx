import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function Layout() {
  return (
    <div className="min-h-screen bg-surface flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 pl-64">
        <TopBar />
        <main className="p-10 pb-32 max-w-[1440px] mx-auto w-full flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

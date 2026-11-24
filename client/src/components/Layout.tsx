import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  ClipboardCheck,
  FileSpreadsheet,
  GraduationCap,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  UserCircle,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/courses/financial-accounting', label: 'Financial Accounting', icon: GraduationCap },
  { to: '/chapters/journal-entries/lesson', label: 'Journal Entries Lesson', icon: BookOpen },
  { to: '/chapters/journal-entries/exercises', label: 'Practical Exercises', icon: FileSpreadsheet },
  { to: '/chapters/journal-entries/quiz', label: 'Final Assessment', icon: ClipboardCheck },
  { to: '/quiz-history', label: 'Quiz History', icon: History },
  { to: '/profile', label: 'Student Profile', icon: UserCircle },
];

export const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const renderNavLinks = (onClick?: () => void) => (
    <nav className="space-y-1 px-3 py-4" aria-label="Primary Navigation">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClick}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-teal-600 text-white'
                  : 'text-slate-200 hover:bg-navy-800 hover:text-white'
              }`
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col bg-navy-900 text-white lg:flex">
        <div className="flex items-center gap-3 border-b border-navy-800 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-white">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <div className="text-base font-bold tracking-tight text-white">Learn Accounting</div>
            <div className="text-xs text-slate-300">First-Year B.Com</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">{renderNavLinks()}</div>

        <div className="border-t border-navy-800 p-4">
          <div className="mb-3 rounded-lg bg-navy-950/60 px-3 py-2.5">
            <div className="truncate text-sm font-medium text-white">{user?.name}</div>
            <div className="truncate text-xs text-slate-300">{user?.email}</div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-navy-700 bg-navy-800 px-3 py-2 text-sm font-medium text-slate-100 hover:bg-navy-700"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative z-10 flex w-72 max-w-[82vw] flex-col bg-navy-900 text-white shadow-xl">
            <div className="flex items-center justify-between border-b border-navy-800 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-bold">Learn Accounting</div>
                  <div className="text-xs text-slate-300">First-Year B.Com</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-md p-1.5 text-slate-300 hover:bg-navy-800 hover:text-white"
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {renderNavLinks(() => setMobileMenuOpen(false))}
            </div>
            <div className="border-t border-navy-800 p-4">
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-navy-800 px-3 py-2 text-sm font-medium text-white hover:bg-navy-700"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-lg border border-slate-200 p-2 text-navy-900 hover:bg-slate-100 lg:hidden"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <div className="text-sm font-semibold text-navy-900">
                Financial Accounting — B.Com Year 1
              </div>
              <div className="hidden text-xs text-slate-500 sm:block">
                Traditional Approach · Indian Rupee (₹) Curriculum
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700 sm:inline-block">
              Student: {user?.name}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 lg:hidden"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

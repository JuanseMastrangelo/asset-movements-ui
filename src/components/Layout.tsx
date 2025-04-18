import { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { AppSidebar } from './app-sidebar';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from './ui/sidebar';
import { Separator } from './ui/separator';
import { Button } from './ui/button';
import { Moon, PlusCircle, Sun } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from './ui/breadcrumb';
import { data } from './app-sidebar';
import { useNavigate } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const currentPath = window.location.pathname;
  const currentSection = data.navMain.find(section =>
    section.items.some(item => item.url === currentPath)
  );
  const breadcrumbItems = data.navMain.flatMap(section =>
    section.items.map(item => ({
      title: item.title,
      url: item.url,
    }))
  );
  const currentBreadcrumb = breadcrumbItems.find(item => item.url === currentPath);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="#">{currentSection ? currentSection.title : 'Inicio'}</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                {currentBreadcrumb && (
                  <BreadcrumbItem>
                    <BreadcrumbPage>{currentBreadcrumb.title}</BreadcrumbPage>
                  </BreadcrumbItem>
                )}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="ml-auto flex items-center gap-4 px-4">
            <Button className="bg-black text-white flex items-center gap-2" onClick={() => navigate('/transactions')}>
              <PlusCircle className="w-4 h-4" /> Crear nueva transacción
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            >
              {theme === "light" ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
              <span className="sr-only">Cambiar tema</span>
            </Button>
            <span className="text-sm text-gray-500">
              {user?.username}
            </span>
            <button
              onClick={logout}
              className="text-sm text-red-500 hover:text-red-700"
            >
              Cerrar sesión
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 mx-5 my-5">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
} 
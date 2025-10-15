import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { routeMap, getDynamicRouteInfo } from '@/lib/navigation';
import { Slash } from 'lucide-react';

const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  const getBreadcrumbs = () => {
    const crumbs = [];
    let currentPath = location.pathname;

    while (currentPath) {
      const routeInfo = routeMap[currentPath] || getDynamicRouteInfo(currentPath);
      if (routeInfo) {
        crumbs.unshift({ path: currentPath, name: routeInfo.name });
        currentPath = routeInfo.parent || '';
      } else {
        // Se não encontrar uma correspondência exata, tenta o pai
        const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/')) || '/';
        if (parentPath === currentPath) break; // Evita loop infinito
        currentPath = parentPath;
        if (currentPath === '/') currentPath = '/pulse'; // Redireciona para a home
      }
    }
    
    // Garante que a home sempre apareça se não for a única página
    if (crumbs.length > 0 && crumbs[0].path !== '/pulse') {
        const homeRoute = routeMap['/pulse'];
        crumbs.unshift({ path: '/pulse', name: homeRoute.name });
    }


    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  if (breadcrumbs.length <= 1 && location.pathname === '/pulse') {
    return null; // Não mostra breadcrumbs na página inicial
  }

  return (
    <Breadcrumb className="mb-6">
      <BreadcrumbList>
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={crumb.path}>
            <BreadcrumbItem>
              {index < breadcrumbs.length - 1 ? (
                <BreadcrumbLink asChild>
                  <Link to={crumb.path} className="text-muted-foreground hover:text-sollux-red">
                    {crumb.name}
                  </Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage className="font-semibold text-foreground">{crumb.name}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
            {index < breadcrumbs.length - 1 && (
              <BreadcrumbSeparator>
                <Slash />
              </BreadcrumbSeparator>
            )}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
};

export default Breadcrumbs;
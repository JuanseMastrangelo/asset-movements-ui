import * as React from "react"
import { useAuth } from "@/contexts/AuthContext"

import { SearchForm } from "@/components/search-form"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { NavMain } from "./nav-main"
import { NavUser } from "./nav-user"

// This is sample data.
export const data = {
  versions: ["1.0.1", "1.1.0-alpha", "2.0.0-beta1"],
  navMain: [
    {
      title: "Dashboard",
      url: "#",
      items: [
        {
          title: "Inicio",
          url: "/",
        },
        {
          title: "Transacciones",
          url: "/transactions",
        },
        {
          title: "Clientes",
          url: "/clients",
        }
      ],
    },
    {
      title: "Configuración",
      url: "#",
      items: [
        {
          title: "Activos",
          url: "/assets",
        },
        {
          title: "Usuarios",
          url: "/settings/users",
        },
        {
          title: "Reglas de Transacciones",
          url: "/transaction-rules",
        },
        {
          title: "Logística",
          url: "/logistics",
        },
        {
          title: "Denominaciones",
          url: "/denominations",
        }
      ],
    },
    {
      title: "Centro de Operaciones",
      url: "#",
      items: [
        {
          title: "Historial de Transacciones",
          url: "/transaction-history",
        }
      ],
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth();

  const userData = user ? {
    name: user.username,
    email: user.email,
    avatar: "/avatars/default.jpg",
  } : null;

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <div className="flex flex-col gap-0.5 leading-none py-2 px-3">
          <span className="font-semibold">Assets Manager</span>
          <span className="">v1.0</span>
        </div>
        <SearchForm />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        {userData && <NavUser user={userData} />}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

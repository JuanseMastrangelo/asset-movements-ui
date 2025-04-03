import { useState, useEffect, useCallback } from "react";
import { Search } from "lucide-react"
import { Spinner } from "@/components/ui/spinner";

import { Label } from "@/components/ui/label"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarInput,
} from "@/components/ui/sidebar"
import { clientService } from "@/services/api";
import debounce from "lodash.debounce";
import { Client } from "@/models";

export function SearchForm({ ...props }: React.ComponentProps<"form">) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = useCallback(
    debounce(async (searchTerm: string) => {
      setLoading(true);
      if (searchTerm) {
        const { data } = await clientService.searchClients(searchTerm);
        setResults(data);
      } else {
        setResults([]);
      }
      setLoading(false);
    }, 1000),
    []
  );

  useEffect(() => {
    handleSearch(query);
  }, [query, handleSearch]);

  return (
    <form {...props}>
      <SidebarGroup className="py-0">
        <SidebarGroupContent className="relative">
          <Label htmlFor="search" className="sr-only">
            Search
          </Label>
          <SidebarInput
            id="search"
            placeholder="Busqueda de clientes..."
            className="pl-8"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Search className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 select-none opacity-50" />
          {(query.trim() !== "") && (
            <div className="absolute bg-white border rounded-md mt-1 w-full max-h-80 overflow-auto z-50">
              {loading ? (
                <div className="flex justify-center p-2">
                  <Spinner size="sm" />
                </div>
              ) : results.length > 0 ? (
                <>
                  <div className="px-3 py-2 border-b">
                    <p className="font-medium">Resultados ({results.length}): </p>
                  </div>
                  {results.map((client) => (
                    <div key={client.id} className="flex flex-col p-3 hover:bg-gray-100 cursor-pointer">
                      <p className="font-medium">{client.name}</p>
                      <p className="text-sm text-gray-500">{client.email}</p>
                    </div>
                  ))}
                </>
              ) : (
                <div className="flex justify-center p-2">
                  <p className="text-sm text-gray-500">No se encontraron resultados</p>
                </div>
              )}
            </div>
          )}
        </SidebarGroupContent>
      </SidebarGroup>
    </form>
  )
}

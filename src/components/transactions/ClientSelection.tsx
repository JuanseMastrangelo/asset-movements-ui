import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, History, User } from "lucide-react";
import { toast } from "sonner";
import { Client } from "@/models";
import { ClientForm, ClientFormData } from "@/components/ui/ClientForm";
import { TransactionHistoryDialog } from "./TransactionHistoryDialog";
import { useNavigate } from 'react-router-dom';

interface ClientSelectionProps {
  onComplete: (client: Client) => void;
  onClientSelected: (client: Client | undefined) => void;
}

export function ClientSelection({ onComplete, onClientSelected }: ClientSelectionProps) {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const navigate = useNavigate();

  const { data: clients, isLoading: isLoadingClients, refetch: refetchClients } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      try {
        const response = await api.get<{ data: Client[] }>("/clients");
        return response.data;
      } catch (error) {
        toast.error("No se pudieron cargar los clientes");
        throw error;
      }
    }
  });

  useEffect(() => {
    onClientSelected(selectedClient ?? undefined);
  }, [selectedClient]);

  const handleClientClick = (client: Client) => {
    setSelectedClient(client);
  };

  const filteredClients = clients?.data.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoadingClients) {
    return <div>Cargando clientes...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Input
          placeholder="Buscar cliente..."
          value={searchTerm}
          type="search"
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" icon={Plus} iconPlacement='left' effect="expandIcon">
              Nuevo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nuevo Cliente</DialogTitle>
            </DialogHeader>
            <ClientForm
              onSubmit={async (data: ClientFormData) => {
                try {
                  const response = await api.post<{ data: Client }>("/clients", data);
                  toast.success("Cliente creado correctamente");
                  setOpen(false);
                  await refetchClients();
                  setSelectedClient(response.data.data);
                } catch (error) {
                  toast.error("No se pudo crear el cliente");
                }
              }}
              onCancel={() => setOpen(false)}
              submitLabel="Crear Cliente"
            />
          </DialogContent>
        </Dialog>
        {
          selectedClient &&
          <Button onClick={() => onComplete(selectedClient)}>
            Cargar Operación para {selectedClient.name}	
          </Button>
        }
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClients?.map((client) => (
              <TableRow
                key={client.id}
                className={selectedClient?.id === client.id ? "bg-muted" : ""}
                onClick={() => handleClientClick(client)}
              >
                <TableCell>{client.name}</TableCell>
                <TableCell>
                  <Badge variant={client.isActive ? 'success' : 'destructive'}>
                    {client.isActive ? 'Activo' : 'Inactivo'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClientClick(client);
                        setIsDialogOpen(true);
                      }}
                      className="flex items-center gap-2"
                    >
                      <History className="h-4 w-4" />
                      Historial de transacciones
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/clients/${client.name}`);
                      }}
                      title="Ver información del cliente"
                    >
                      <User className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!filteredClients?.length && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  No se encontraron clientes
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {selectedClient && (
        <TransactionHistoryDialog
          clientId={selectedClient.id}
          clientName={selectedClient.name}
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
        />
      )}
    </div>
  );
} 
import { useState } from "react";
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
import { Mail, Eye, Edit, Plus } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/components/ui/use-toast";

interface CurrentAccount {
  type: string;
  balance: number;
}

interface Client {
  id: string;
  name: string;
  status: string;
  currentAccounts?: CurrentAccount[];
}

interface Transaction {
  id: string;
  type: string;
  lastMovement: string;
  inherits: boolean;
  state: "COMPLETED" | "PENDING" | "CURRENT_ACCOUNT";
  egress: number;
  ingress: number;
  createdBy: string;
}

interface ClientSelectionProps {
  onComplete: (client: Client) => void;
  initialData?: Client;
}

export function ClientSelection({ onComplete, initialData }: ClientSelectionProps) {
  const { toast } = useToast();
  const [selectedClient, setSelectedClient] = useState<Client | null>(initialData || null);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: clients, isLoading: isLoadingClients } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      try {
        const response = await api.get<{ data: Client[] }>("/clients");
        return response.data;
      } catch (error) {
        toast({
          title: "Error",
          description: "No se pudieron cargar los clientes",
          variant: "destructive",
        });
        throw error;
      }
    }
  });

  const { data: clientTransactions, isLoading: isLoadingTransactions } = useQuery({
    queryKey: ["client-transactions", selectedClient?.id],
    queryFn: async () => {
      try {
        const response = await api.get<{ data: Transaction[] }>(`/clients/${selectedClient?.id}/transactions`);
        return response.data;
      } catch (error) {
        toast({
          title: "Error",
          description: "No se pudieron cargar las transacciones",
          variant: "destructive",
        });
        throw error;
      }
    },
    enabled: !!selectedClient?.id
  });

  const handleSendReport = async (clientId: string) => {
    try {
      await api.post(`/clients/${clientId}/send-report`);
      toast({
        title: "Éxito",
        description: "Reporte enviado correctamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo enviar el reporte",
        variant: "destructive",
      });
    }
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
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nuevo Cliente</DialogTitle>
            </DialogHeader>
            {/* Formulario de creación de cliente */}
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Cuenta Corriente</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClients?.map((client) => (
              <TableRow
                key={client.id}
                className={selectedClient?.id === client.id ? "bg-muted" : ""}
                onClick={() => setSelectedClient(client)}
              >
                <TableCell>{client.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {client.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {client.currentAccounts?.map((account) => (
                    <div key={account.type} className="flex items-center gap-2">
                      <span>{account.type}:</span>
                      <span className={account.balance < 0 ? "text-red-500" : "text-green-600"}>
                        {account.balance.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSendReport(client.id);
                      }}
                    >
                      <Mail className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`/clients/${client.id}`, '_blank');
                      }}
                    >
                      <Eye className="h-4 w-4" />
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
        <>
          <h3 className="text-lg font-semibold mt-6">Historial de Transacciones</h3>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Último movimiento</TableHead>
                  <TableHead>Hereda</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Egresa</TableHead>
                  <TableHead>Ingresa</TableHead>
                  <TableHead>Realizada por</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingTransactions ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      Cargando transacciones...
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {clientTransactions?.data.map((transaction: Transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>{transaction.id.slice(0, 8)}</TableCell>
                        <TableCell>{transaction.type}</TableCell>
                        <TableCell>
                          {format(new Date(transaction.lastMovement), "dd/MM/yyyy HH:mm", { locale: es })}
                        </TableCell>
                        <TableCell>
                          {transaction.inherits ? "Sí" : "No"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              transaction.state === "COMPLETED"
                                ? "default"
                                : transaction.state === "PENDING"
                                ? "outline"
                                : "secondary"
                            }
                          >
                            {transaction.state === "COMPLETED"
                              ? "Completada"
                              : transaction.state === "PENDING"
                              ? "Pendiente"
                              : "Cuenta Corriente"}
                          </Badge>
                        </TableCell>
                        <TableCell>{transaction.egress.toLocaleString()}</TableCell>
                        <TableCell>{transaction.ingress.toLocaleString()}</TableCell>
                        <TableCell>{transaction.createdBy}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => window.open(`/transactions/${transaction.id}`, '_blank')}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {transaction.state === "CURRENT_ACCOUNT" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => window.open(`/transactions/${transaction.id}/edit`, '_blank')}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!clientTransactions?.data.length && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8">
                          No hay transacciones para mostrar
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end mt-6">
            <Button
              onClick={() => selectedClient && onComplete(selectedClient)}
              disabled={!selectedClient}
            >
              Cargar Operación
            </Button>
          </div>
        </>
      )}
    </div>
  );
} 
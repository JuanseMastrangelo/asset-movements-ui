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
import { useNavigate } from "react-router-dom";
import { Client } from "@/models";
import { Transaction } from "@/models/transaction";

interface ClientSelectionProps {
  onComplete: (client: Client) => void;
}

export function ClientSelection({ onComplete }: ClientSelectionProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
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
        const response = await api.get<{ data: Transaction[] }>(`/transactions/search?clientId=${selectedClient?.id}`);
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
    enabled: !!selectedClient?.id,
    refetchOnWindowFocus: false,
    refetchInterval: false
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
          </DialogContent>
        </Dialog>
        {
          selectedClient &&
          <Button variant="outline" onClick={() => onComplete(selectedClient)}>
            <Plus className="h-4 w-4 mr-2" />
            Cargar Operación
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
                onClick={() => setSelectedClient(client)}
              >
                <TableCell>{client.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {client.isActive ? 'Active' : 'Inactive'}
                  </Badge>
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
                  <TableHead>Fecha</TableHead>
                  <TableHead>Notas</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Ingreso</TableHead>
                  <TableHead>Egreso</TableHead>
                  <TableHead>Creado por</TableHead>
                  <TableHead>Transacción Padre</TableHead>
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
                        <TableCell>
                          {format(new Date(transaction.date), "dd/MM/yyyy HH:mm", { locale: es })}
                        </TableCell>
                        <TableCell>{transaction.notes}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              transaction.state === "COMPLETED"
                                ? "default"
                                : "outline"
                            }
                          >
                            {transaction.state === "COMPLETED"
                              ? "Completada"
                              : "Pendiente"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {transaction.details
                            .filter(detail => detail.movementType === "INCOME")
                            .reduce((sum, detail) => sum + detail.amount, 0)
                            .toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {transaction.details
                            .filter(detail => detail.movementType === "EXPENSE")
                            .reduce((sum, detail) => sum + detail.amount, 0)
                            .toLocaleString()}
                        </TableCell>
                        <TableCell>{transaction.createdBy}</TableCell>
                        <TableCell>
                          {transaction.parentTransaction ? (
                            <Badge variant="secondary">
                              {transaction.parentTransaction.id.slice(0, 8)}
                            </Badge>
                          ) : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(`/transactions/${transaction.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {transaction.state === "PENDING" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate(`/transactions/${transaction.id}`)}
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
        </>
      )}
    </div>
  );
} 
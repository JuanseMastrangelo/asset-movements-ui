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
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Client } from "@/models";
import { Transaction } from "@/models/transaction";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface ClientSelectionProps {
  onComplete: (client: Client) => void;
}

const clientSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(1, "El teléfono es requerido"),
  address: z.string().min(1, "La dirección es requerida"),
  country: z.string().min(1, "El país es requerido"),
});

type ClientFormData = z.infer<typeof clientSchema>;

export function ClientSelection({ onComplete }: ClientSelectionProps) {
  const navigate = useNavigate();
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [open, setOpen] = useState(false);

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

  const { data: clientTransactions, isLoading: isLoadingTransactions } = useQuery({
    queryKey: ["client-transactions", selectedClient?.id],
    queryFn: async () => {
      try {
        const response = await api.get<{ data: Transaction[] }>(`/transactions/search?clientId=${selectedClient?.id}`);
        return response.data;
      } catch (error) {
        toast.error("No se pudieron cargar las transacciones");
        throw error;
      }
    },
    enabled: !!selectedClient?.id,
    refetchOnWindowFocus: false,
    refetchInterval: false
  });

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      country: "",
    },
  });

  const handleSendReport = async (clientId: string) => {
    try {
      await api.post(`/clients/${clientId}/send-report`);
      toast.success("Reporte enviado correctamente");
    } catch (error) {
      toast.error("No se pudo enviar el reporte");
    }
  };

  const handleCreateClient = async (data: ClientFormData) => {
    try {
      const response = await api.post<{ data: Client }>("/clients", data);
      toast.success("Cliente creado correctamente");
      setOpen(false);
      form.reset();
      await refetchClients();
      console.log(response);
      setSelectedClient(response.data.data);
    } catch (error) {
      toast.error("No se pudo crear el cliente");
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
          type="search"
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nuevo Cliente</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreateClient)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dirección</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>País</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full">
                  Crear Cliente
                </Button>
              </form>
            </Form>
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
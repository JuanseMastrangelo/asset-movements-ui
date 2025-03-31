import { useQuery } from '@tanstack/react-query';
import { assetService } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Eye, CheckCircle, FileText } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { api } from "@/services/api"

const formatAmount = (amount: number) => {
  const prefix = amount > 0 ? '+' : amount < 0 ? '-' : '';
  return `${prefix}${Math.abs(amount).toLocaleString()}`;
};

type TransactionState = "PENDING" | "COMPLETED" | "CURRENT_ACCOUNT"

type Transaction = {
  id: string
  date: string
  state: TransactionState
  notes: string
  clientId: string
  clientName: string
  parentTransactionId: string | null
  parentClientName: string | null
}

type BadgeVariant = "default" | "destructive" | "outline" | "secondary"

const getStateVariant = (state: TransactionState): BadgeVariant => {
  switch (state) {
    case "COMPLETED":
      return "secondary"
    case "PENDING":
      return "outline"
    default:
      return "default"
  }
}

export default function Home() {
  const navigate = useNavigate();
  const [selectedNote, setSelectedNote] = useState<string | null>(null)

  // Query for stock data
  const { data: stockData, refetch: refetchStock } = useQuery({
    queryKey: ['dashboard-stock'],
    queryFn: () => assetService.getStockSummary(),
    refetchOnWindowFocus: false,
    refetchInterval: false
  });

  // Query for current accounts data
  const { data: currentAccountsData, refetch: refetchCurrentAccounts } = useQuery({
    queryKey: ['dashboard-current-accounts'],
    queryFn: () => assetService.getCurrentAccounts(),
    refetchOnWindowFocus: false,
    refetchInterval: false
  });

  // Query for pending tasks
  const { data: pendingTasksData, refetch: refetchPendingTasks } = useQuery({
    queryKey: ['dashboard-pending-tasks'],
    queryFn: () => assetService.getPendingTasks(),
    refetchOnWindowFocus: false,
    refetchInterval: false
  });

  const { data: transactionHistoryData } = useQuery({
    queryKey: ["transactionHistory"],
    queryFn: () => api.get<{ data: Transaction[] }>("/dashboard/transaction-history"),
    refetchOnWindowFocus: false,
    refetchInterval: false
  })

  const handleRefresh = () => {
    refetchStock();
    refetchCurrentAccounts();
    refetchPendingTasks();
  };

  const handleCompleteTask = async (clientId: string) => {
    try {
      await assetService.completeTask(clientId);
      refetchPendingTasks();
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar información
        </Button>
      </div>

      {/* Stock and Accounts Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Total Stock Table */}
        <Card>
          <CardHeader>
            <CardTitle>Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockData?.data
                    .sort((a, b) => Math.abs(b.totalAmount) - Math.abs(a.totalAmount))
                    .map((asset) => (
                      <TableRow key={asset.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>{asset.name}</span>
                            <Badge
                              variant="secondary"
                              className="ml-1"
                            >
                              {asset.type}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className={cn(
                          "text-right font-medium",
                          asset.totalAmount < 0 && "text-red-500",
                          asset.totalAmount > 0 && "text-green-600"
                        )}>
                          {formatAmount(asset.totalAmount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  {!stockData?.data.length && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground">
                        No hay stock disponible
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cuentas Corrientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentAccountsData?.data
                    .sort((a, b) => Math.abs(b.totalAmount) - Math.abs(a.totalAmount))
                    .map((account) => (
                      <TableRow key={account.id}>
                        <TableCell>
                          <div className="flex items-center">
                            <span>{account.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className={cn(
                          "text-right font-medium",
                          account.totalAmount < 0 && "text-red-500",
                          account.totalAmount > 0 && "text-green-600"
                        )}>
                          {formatAmount(account.totalAmount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  {!currentAccountsData?.data.length && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground">
                        No hay cuentas corrientes disponibles
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Tasks Table */}
      <Card>
        <CardHeader>
          <CardTitle>Por hacer</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 z-20 w-[200px]">
                  Cliente
                </TableHead>
                <TableHead className="text-right w-[200px]">
                  Egresa
                </TableHead>
                <TableHead className="text-right w-[200px]">
                  Ingresa
                </TableHead>
                <TableHead className="sticky right-0 z-20 w-[300px] text-right">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingTasksData?.data.clients.map((client) => {
                const nonZeroAssets = pendingTasksData.data.assets
                  .filter(asset => client.assetTotals[asset.id] !== 0)
                  .map(asset => ({
                    id: asset.id,
                    name: asset.name,
                    amount: client.assetTotals[asset.id]
                  }))
                  .slice(0, 2);

                return (
                  <TableRow key={client.clientId}>
                    <TableCell className="sticky left-0 z-20 font-medium">
                      {client.clientName}
                    </TableCell>
                    <TableCell className="text-right">
                      {nonZeroAssets[0] ? (
                        <span className={cn(
                          "font-medium",
                          nonZeroAssets[0].amount < 0 && "text-red-500",
                          nonZeroAssets[0].amount > 0 && "text-green-600"
                        )}>
                          {formatAmount(nonZeroAssets[0].amount)} {nonZeroAssets[0].name}
                        </span>
                      ) : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {nonZeroAssets[1] ? (
                        <span className={cn(
                          "font-medium",
                          nonZeroAssets[1].amount < 0 && "text-red-500",
                          nonZeroAssets[1].amount > 0 && "text-green-600"
                        )}>
                          {formatAmount(nonZeroAssets[1].amount)} {nonZeroAssets[1].name}
                        </span>
                      ) : "-"}
                    </TableCell>
                    <TableCell className="sticky right-0 z-20">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCompleteTask(client.clientId)}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Marcar como completada
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/transactions/${client.transactions[0]?.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Operación
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!pendingTasksData?.data.clients.length && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-muted-foreground h-24"
                  >
                    No hay tareas pendientes
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Transacciones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative w-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Transacción Padre</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactionHistoryData?.data.data.map((transaction: Transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>{transaction.clientName}</TableCell>
                    <TableCell>
                      <Badge variant={getStateVariant(transaction.state)}>
                        {transaction.state === "COMPLETED"
                          ? "Completada"
                          : transaction.state === "PENDING"
                          ? "Pendiente"
                          : "Cuenta Corriente"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {transaction.parentClientName || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedNote(transaction.notes)}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                        >
                          <a href={`/operaciones/${transaction.id}`}>
                            <Eye className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedNote} onOpenChange={() => setSelectedNote(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nota de la transacción</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {selectedNote}
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}

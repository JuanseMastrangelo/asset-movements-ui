import { useQuery } from '@tanstack/react-query';
import { assetService } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Eye } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn, formatAmount } from '@/lib/utils';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"



// Primero, vamos a crear los skeletons para cada sección
const StockSkeleton = () => (
  <div className="space-y-3">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex justify-between items-center">
        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
      </div>
    ))}
  </div>
);

const CurrentAccountsSkeleton = () => (
  <div className="space-y-3">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex justify-between items-center">
        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
      </div>
    ))}
  </div>
);

const PendingTasksSkeleton = () => (
  <div className="space-y-3">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="flex justify-between items-center">
        <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
      </div>
    ))}
  </div>
);

export default function Home() {
  const navigate = useNavigate();
  const [selectedNote, setSelectedNote] = useState<string | null>(null)

  // Query for stock data
  const { data: stockData, refetch: refetchStock, isFetching: isLoadingStock } = useQuery({
    queryKey: ['dashboard-stock'],
    queryFn: () => assetService.getStockSummary(),
    refetchOnWindowFocus: false,
    refetchInterval: false
  });

  // Query for current accounts data
  const { data: currentAccountsData, refetch: refetchCurrentAccounts, isFetching: isLoadingCurrentAccounts } = useQuery({
    queryKey: ['dashboard-current-accounts'],
    queryFn: () => assetService.getCurrentAccounts(),
    refetchOnWindowFocus: false,
    refetchInterval: false
  });

  // Query for pending tasks
  const { data: pendingTasksData, refetch: refetchPendingTasks, isFetching: isLoadingPendingTasks } = useQuery({
    queryKey: ['dashboard-pending-tasks'],
    queryFn: () => assetService.getPendingTasks(),
    refetchOnWindowFocus: false,
    refetchInterval: false
  });

  const handleRefresh = () => {
    refetchStock();
    refetchCurrentAccounts();
    refetchPendingTasks();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Button 
          onClick={handleRefresh} 
          variant="outline" 
          size="sm"
          disabled={isLoadingStock || isLoadingCurrentAccounts || isLoadingPendingTasks}
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", (isLoadingStock || isLoadingCurrentAccounts || isLoadingPendingTasks) && "animate-spin")} />
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
            {isLoadingStock ? (
              <StockSkeleton />
            ) : (
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
                                {asset.type === 'PHYSICAL' ? 'Físico' : 'Digital'}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ${asset.totalAmount}
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
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cuentas Corrientes</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingCurrentAccounts ? (
              <CurrentAccountsSkeleton />
            ) : (
              <div className="max-h-[400px] overflow-y-auto">
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-green-500"></div>
                    <span className="text-sm">Cliente debe</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-red-500"></div>
                    <span className="text-sm">Sistema debe</span>
                  </div>
                </div>
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
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pending Tasks Table */}
      <Card>
        <CardHeader>
          <CardTitle>Por hacer</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingPendingTasks ? (
            <PendingTasksSkeleton />
          ) : (
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
          )}
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

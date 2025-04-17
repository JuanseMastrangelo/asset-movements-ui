import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Transaction } from "@/models/transaction";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from 'react-router-dom';

interface TransactionHistoryDialogProps {
  clientId: string;
  clientName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function TransactionHistoryDialog({ clientId, clientName, isOpen, onClose }: TransactionHistoryDialogProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  const { data: clientTransactions, isLoading: isLoadingTransactions } = useQuery({
    queryKey: ["client-transactions", clientId],
    queryFn: async () => {
      const response = await api.get<{ data: Transaction[] }>(`/transactions/search?clientId=${clientId}`);
      return response.data;
    },
    enabled: isOpen,
  });

  const toggleRow = (transactionId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(transactionId)) {
        newSet.delete(transactionId);
      } else {
        newSet.add(transactionId);
      }
      return newSet;
    });
  };

  const parentTransactions = clientTransactions?.data.filter(transaction => !transaction.parentTransactionId);
  const childTransactionsMap = clientTransactions?.data.reduce((acc, transaction) => {
    if (transaction.parentTransactionId) {
      if (!acc[transaction.parentTransactionId]) {
        acc[transaction.parentTransactionId] = [];
      }
      acc[transaction.parentTransactionId].push(transaction);
    }
    return acc;
  }, {} as Record<string, Transaction[]>) || {};

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent style={{ width: '60vw', maxWidth: '60vw' }}>
        <DialogHeader>
          <DialogTitle>Historial de transacciones de {clientName}</DialogTitle>
        </DialogHeader>
        <div className="border rounded-lg mt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Ingreso</TableHead>
                <TableHead>Egreso</TableHead>
                <TableHead style={{ padding: '0' }}>Notas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingTransactions ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    Cargando transacciones...
                  </TableCell>
                </TableRow>
              ) : (
                parentTransactions?.map((transaction: Transaction) => (
                  <>
                    <TableRow key={transaction.id} onClick={() => toggleRow(transaction.id)} style={{ cursor: 'pointer', backgroundColor: 'transparent' }}>
                      <TableCell style={{ width: '250px' }}>
                        <div className="flex items-center">
                          {expandedRows.has(transaction.id) ? (
                            <ChevronDown className="mr-2" />
                          ) : (
                            <ChevronRight className="mr-2" />
                          )}
                          {format(new Date(transaction.date), "dd/MM/yyyy HH:mm", { locale: es })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            transaction.state === "COMPLETED"
                              ? "outline"
                              : transaction.state === "CURRENT_ACCOUNT"
                              ? "warning"
                              : "outline"
                          }
                          style={{
                            backgroundColor: transaction.state === "CURRENT_ACCOUNT" ? '#FFD580' : undefined,
                            color: transaction.state === "CURRENT_ACCOUNT" ? '#000000' : undefined,
                          }}
                        >
                          {transaction.state === "COMPLETED"
                            ? "Completada"
                            : transaction.state === "CURRENT_ACCOUNT"
                            ? "Cuenta Corriente"
                            : "Pendiente"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {transaction.details
                          .filter(detail => detail.movementType === "INCOME")
                          .map(detail => `${detail.amount.toLocaleString()} ${detail.asset.description}`)
                          .join(", ")}
                      </TableCell>
                      <TableCell>
                        {transaction.details
                          .filter(detail => detail.movementType === "EXPENSE")
                          .map(detail => `${detail.amount.toLocaleString()} ${detail.asset.description}`)
                          .join(", ")}
                      </TableCell>
                      <TableCell style={{ width: '200px', padding: '0' }}>
                        <div
                          title={transaction.notes}
                          style={{
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '200px',
                            cursor: 'pointer',
                          }}
                        >
                          {transaction.notes}
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandedRows.has(transaction.id) && (
                      <TableRow>
                        <TableCell colSpan={5} style={{ padding: '0' }} className="bg-white">
                          <div>
                            <Table className="mx-auto">
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Transacciones hijas</TableHead>
                                  <TableHead>Ingreso</TableHead>
                                  <TableHead>Egreso</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {childTransactionsMap[transaction.id]?.map((childTransaction: Transaction) => (
                                  <TableRow key={childTransaction.id} style={{ backgroundColor: 'transparent' }}>
                                    <TableCell>
                                      {`${format(new Date(childTransaction.date), "dd/MM/yyyy HH:mm", { locale: es })} - ${childTransaction.state === "COMPLETED" ? "Completada" : childTransaction.state === "CURRENT_ACCOUNT" ? "Cuenta Corriente" : "Pendiente"}`}
                                    </TableCell>
                                    <TableCell>
                                      {childTransaction.details
                                        .filter(detail => detail.movementType === "INCOME")
                                        .map(detail => `${detail.amount.toLocaleString()} ${detail.asset.description}`)
                                        .join(", ")}
                                    </TableCell>
                                    <TableCell>
                                      {childTransaction.details
                                        .filter(detail => detail.movementType === "EXPENSE")
                                        .map(detail => `${detail.amount.toLocaleString()} ${detail.asset.description}`)
                                        .join(", ")}
                                    </TableCell>
                                  </TableRow>
                                ))}
                                {transaction.state === "CURRENT_ACCOUNT" && (
                                  <TableRow>
                                    <TableCell>Total</TableCell>
                                    <TableCell>
                                      {(() => {
                                        const totalIncome = childTransactionsMap[transaction.id]?.reduce((sum, childTransaction) => {
                                          return sum + childTransaction.details
                                            .filter(detail => detail.movementType === "INCOME")
                                            .reduce((acc, detail) => acc + detail.amount, 0);
                                        }, 0) - transaction.details
                                          .filter(detail => detail.movementType === "INCOME")
                                          .reduce((acc, detail) => acc + detail.amount, 0);
                                        return totalIncome !== 0 ? <Badge variant="destructive">{totalIncome}</Badge> : totalIncome;
                                      })()}
                                    </TableCell>
                                    <TableCell>
                                      {(() => {
                                        const totalExpense = childTransactionsMap[transaction.id]?.reduce((sum, childTransaction) => {
                                          return sum + childTransaction.details
                                            .filter(detail => detail.movementType === "EXPENSE")
                                            .reduce((acc, detail) => acc + detail.amount, 0);
                                        }, 0) - transaction.details
                                          .filter(detail => detail.movementType === "EXPENSE")
                                          .reduce((acc, detail) => acc + detail.amount, 0);
                                        return totalExpense !== 0 ? <Badge variant="destructive">{totalExpense}</Badge> : totalExpense;
                                      })()}
                                    </TableCell>
                                  </TableRow>
                                )}
                                {(transaction.state === "CURRENT_ACCOUNT" || transaction.state === "PENDING") && (
                                  <TableRow>
                                    <TableCell colSpan={3} className="text-center">
                                      <Button variant="outline" onClick={() => navigate(`/transactions/${transaction.id}`)}>Crear transacción hija</Button>
                                    </TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
} 
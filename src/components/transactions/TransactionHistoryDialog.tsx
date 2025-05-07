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
        newSet.clear(); // Close all if manually closed
      } else {
        newSet.clear(); // Ensure only one is expanded
        newSet.add(transactionId);
      }
      return newSet;
    });
  };

  const parentTransactions = clientTransactions?.data
    .filter(transaction => !transaction.parentTransactionId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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
        <div className="border rounded-lg mt-6 overflow-y-auto max-h-[60vh]">
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
                parentTransactions?.map((transaction: Transaction) => {
                  return (
                    <>
                      <TableRow key={transaction.id} onClick={() => toggleRow(transaction.id)} style={{ cursor: 'pointer', backgroundColor: 'transparent' }}>
                        <TableCell className="w-1/5">
                          <div className="flex items-center">
                            {expandedRows.has(transaction.id) ? (
                              <ChevronDown className="mr-2" />
                            ) : (
                              <ChevronRight className="mr-2" />
                            )}
                            {format(new Date(transaction.date), "dd/MM/yyyy HH:mm", { locale: es })}
                          </div>
                        </TableCell>
                        <TableCell className="w-1/5">
                          <Badge
                            variant={
                              transaction.state === "COMPLETED"
                                ? "success"
                                : transaction.state === "CURRENT_ACCOUNT"
                                ? "outline"
                                : "warning"
                            }
                          >
                            {transaction.state === "COMPLETED"
                              ? "Completada"
                              : transaction.state === "CURRENT_ACCOUNT"
                              ? "Cuenta Corriente"
                              : "Pendiente"}
                          </Badge>
                        </TableCell>
                        <TableCell className="w-1/6">
                          {transaction.details
                            .filter(detail => detail.movementType === "INCOME")
                            .map(detail => `${detail.amount.toLocaleString()} ${detail.asset.description}`)
                            .join(", ")}
                        </TableCell>
                        <TableCell className="w-1/6">
                          {transaction.details
                            .filter(detail => detail.movementType === "EXPENSE")
                            .map(detail => `${detail.amount.toLocaleString()} ${detail.asset.description}`)
                            .join(", ")}
                        </TableCell>
                        <TableCell className="w-1/4 p-0">
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
                        <TableCell colSpan={5} style={{ padding: '0' }}>
                          <div>
                            <Table className="mx-auto">
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Transacciones hijas</TableHead>
                                  <TableHead>Ingreso</TableHead>
                                  <TableHead>Egreso</TableHead>
                                  <TableHead style={{ padding: '0' }}>Notas</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {childTransactionsMap[transaction.id]?.map((childTransaction: Transaction) => (
                                  <TableRow key={childTransaction.id} style={{ backgroundColor: 'transparent' }}>
                                    <TableCell className="w-2/5">
                                      {`${format(new Date(childTransaction.date), "dd/MM/yyyy HH:mm", { locale: es })}`}
                                    </TableCell>
                                    <TableCell className="w-1/6">
                                      $ {childTransaction.details
                                        .filter(detail => detail.movementType === "INCOME")
                                        .map(detail => `${detail.amount.toLocaleString()} ${detail.asset.description}`)
                                        .join(", ") || 0}
                                    </TableCell>
                                    <TableCell className="w-1/6">
                                      $ {childTransaction.details
                                        .filter(detail => detail.movementType === "EXPENSE")
                                        .map(detail => `${detail.amount.toLocaleString()} ${detail.asset.description}`)
                                        .join(", ") || 0}
                                    </TableCell>
                                    <TableCell className="w-1/4">{childTransaction.notes}</TableCell>
                                  </TableRow>
                                ))}
                                {transaction.state === "CURRENT_ACCOUNT" && (
                                  <TableRow className="bg-gray-700 hover:bg-gray-700 text-white">
                                    <TableCell className="w-1/4">Restan</TableCell>
                                    <TableCell className="w-1/6">
                                      {(() => {
                                        const totalIncome = transaction.details
                                        .filter(detail => detail.movementType === "INCOME")
                                        .reduce((acc, detail) => acc + detail.amount, 0) - childTransactionsMap[transaction.id]?.reduce((sum, childTransaction) => {
                                          return sum + childTransaction.details
                                            .filter(detail => detail.movementType === "INCOME")
                                            .reduce((acc, detail) => acc + detail.amount, 0);
                                        }, 0) || 0;
                                        return `$ ${totalIncome} ${transaction.details.find(detail => detail.movementType === "INCOME")?.asset.description}`
                                      })()}
                                    </TableCell>
                                    <TableCell className="w-1/6">
                                      {(() => {
                                        const totalExpense = transaction.details
                                        .filter(detail => detail.movementType === "EXPENSE")
                                        .reduce((acc, detail) => acc + detail.amount, 0) - childTransactionsMap[transaction.id]?.reduce((sum, childTransaction) => {
                                          return sum + childTransaction.details
                                            .filter(detail => detail.movementType === "EXPENSE")
                                            .reduce((acc, detail) => acc + detail.amount, 0);
                                        }, 0) || 0;
                                        return `$ ${totalExpense} ${transaction.details.find(detail => detail.movementType === "EXPENSE")?.asset.description}`
                                      })()}
                                    </TableCell>
                                    <TableCell className="w-1/4"></TableCell>
                                  </TableRow>
                                )}
                                {(transaction.state === "CURRENT_ACCOUNT" || transaction.state === "PENDING") && (
                                  <TableRow>
                                    <TableCell colSpan={4} className="text-center">
                                      <Button variant="outline" onClick={() => navigate(`/transactions/${transaction.id}?step=values`)}>Crear transacción hija</Button>
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
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
} 
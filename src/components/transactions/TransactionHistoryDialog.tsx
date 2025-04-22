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
import { Spinner } from "@/components/ui/spinner";
import { transactionsService } from "@/services/api";

interface TransactionHistoryDialogProps {
  clientId: string;
  clientName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function TransactionHistoryDialog({ clientId, clientName, isOpen, onClose }: TransactionHistoryDialogProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [transactionDetails, setTransactionDetails] = useState<Transaction | null>(null);
  const [loadingTransaction, setLoadingTransaction] = useState<boolean>(false);
  const navigate = useNavigate();

  const { data: clientTransactions, isLoading: isLoadingTransactions } = useQuery({
    queryKey: ["client-transactions", clientId],
    queryFn: async () => {
      const response = await api.get<{ data: Transaction[] }>(`/transactions/search?clientId=${clientId}`);
      return response.data;
    },
    enabled: isOpen,
  });

  const fetchTransactionDetails = async (transactionId: string) => {
    setLoadingTransaction(true);
    try {
      const transactionDetails = await transactionsService.getOne(transactionId);
      console.log(transactionDetails);
      setTransactionDetails(transactionDetails);
    } catch (error) {
      console.error('Error fetching transaction details:', error);
    } finally {
      setLoadingTransaction(false);
    }
  };

  const toggleRow = (transactionId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(transactionId)) {
        newSet.clear(); // Close all if manually closed
        setTransactionDetails(null);
      } else {
        newSet.clear(); // Ensure only one is expanded
        newSet.add(transactionId);
        fetchTransactionDetails(transactionId);
      }
      return newSet;
    });
  };

  const parentTransactions = clientTransactions?.data.filter(transaction => !transaction.parentTransactionId);

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
                parentTransactions?.map((transaction: Transaction) => {
                  return (
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
                            {loadingTransaction ? (
                              <div className="flex justify-center items-center py-4">
                                <Spinner />
                              </div>
                            ) : (
                              transactionDetails && (
                                <div>
                                  <div className="flex justify-between items-center px-4 pt-4 pb-2">
                                    <div className="text-sm">Resumen General:</div>
                                    <Badge variant="default">
                                      {transactionDetails.childTransactions.length} transacciones en total
                                    </Badge>
                                  </div>
                                  <Table className="mx-auto">
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead>Ingreso</TableHead>
                                        <TableHead>Egreso</TableHead>
                                        <TableHead>Nota</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                    {transactionDetails.childTransactions
                                      .flatMap((transaction) => transaction.details.map((detail) => {
                                        return ({
                                          ...detail,
                                          date: transaction.date,
                                        })
                                      }))
                                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                                      .map((detail, index) => {
                                        return (
                                          <TableRow key={index} style={{ backgroundColor: 'transparent' }}>
                                            <TableCell className="text-left py-2">{new Date(detail.date).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}</TableCell>
                                            <TableCell className="text-left py-2">{detail.movementType === "INCOME" ? `$ ${detail.amount} ${transactionDetails?.details.find((d) => d.assetId === detail.assetId)?.asset.name}` : ''}</TableCell>
                                            <TableCell className="text-left py-2">{detail.movementType === "EXPENSE" ? `$ ${detail.amount} ${transactionDetails?.details.find((d) => d.assetId === detail.assetId)?.asset.name}` : ''}</TableCell>
                                            <TableCell className="text-left py-2">{detail.notes}</TableCell>
                                          </TableRow>
                                        )
                                      })}
                                      <TableRow className="bg-gray-800 hover:bg-gray-800 text-white">
                                        <TableCell>Restan:</TableCell>
                                        <TableCell>
                                          $ {
                                            (transactionDetails?.details?.find((detail) => detail.movementType === "INCOME")?.amount || 0) - transactionDetails.childTransactions
                                            .flatMap(transaction => transaction.details)
                                            .filter(detail => detail.movementType === "INCOME")
                                            .reduce((total, detail) => total + detail.amount, 0)
                                          }
                                        </TableCell>
                                        <TableCell>
                                          $ {
                                            (transactionDetails?.details?.find((detail) => detail.movementType === "EXPENSE")?.amount || 0) - transactionDetails.childTransactions
                                            .flatMap(transaction => transaction.details)
                                            .filter(detail => detail.movementType === "EXPENSE")
                                            .reduce((total, detail) => total + detail.amount, 0)
                                          }
                                        </TableCell>
                                        <TableCell></TableCell>
                                      </TableRow>
                                      {(transactionDetails?.state === "CURRENT_ACCOUNT" || transactionDetails?.state === "PENDING") && (
                                        <TableRow>
                                          <TableCell colSpan={4} className="text-center">
                                            <Button variant="outline" onClick={() => navigate(`/transactions/${transactionDetails.id}?step=values`)}>Crear transacción hija</Button>
                                          </TableCell>
                                        </TableRow>
                                      )}
                                    </TableBody>
                                  </Table>
                                </div>
                              )
                            )}
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
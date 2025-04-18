import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Spinner } from '../components/ui/spinner';
import { transactionsService } from '@/services/api';
import { useParams } from 'react-router-dom';
import { TransactionSearchResponse } from '@/models/transaction';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function TransactionHistory() {
  const { clientId, state, startDate, endDate, parentTransactionId } = useParams();
  const [searchParams, setSearchParams] = useState({ clientId, state, startDate, endDate, parentTransactionId, page: '1' });

  const { data, isLoading, error } = useQuery<TransactionSearchResponse>(
    {
      queryKey: ['transactions', searchParams],
      queryFn: async () => {
        const response = await transactionsService.search(searchParams);
        return response;
      },
      enabled: true,
    }
  );

  const transactions = data?.data || [];
  const totalTransactions = data?.meta.pagination.total || 0;
  const transactionsPerPage = data?.meta.pagination.limit || 25;
  const totalPages = data?.meta.pagination.totalPages || 1;

  const [currentPage, setCurrentPage] = useState(1);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    setSearchParams({ ...searchParams, page: newPage.toString() });
  };

  if (isLoading) return <Spinner size='lg' />;
  if (error) return <div>Error al cargar el historial de transacciones.</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Historial de Transacciones</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha y Hora</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Resta por entregar</TableHead>
            <TableHead>Resta por ingresar</TableHead>
            <TableHead>Nota</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map(transaction => {
            const incomeDetails = transaction.details.filter(detail => detail.movementType === 'INCOME');
            const expenseDetails = transaction.details.filter(detail => detail.movementType === 'EXPENSE');

            const remainingToDeliver = incomeDetails.map(detail => ({
              assetName: detail.asset.name,
              remaining: detail.amount - detail.billDetails.reduce((sum, billDetail) => sum + billDetail.quantity * billDetail.denomination.value, 0)
            }));

            const remainingToEnter = expenseDetails.map(detail => ({
              assetName: detail.asset.name,
              remaining: detail.amount - detail.billDetails.reduce((sum, billDetail) => sum + billDetail.quantity * billDetail.denomination.value, 0)
            }));

            return (
              <TableRow key={transaction.id}>
                <TableCell>{format(new Date(transaction.createdAt), "dd/MM/yyyy HH:mm:ss", { locale: es })}</TableCell>
                <TableCell>{transaction.client.name}</TableCell>
                <TableCell><span className={`badge badge-${transaction.state.toLowerCase()}`}>{transaction.state}</span></TableCell>
                <TableCell>{remainingToDeliver.map(item => `${item.assetName}: ${item.remaining}`).join(', ')}</TableCell>
                <TableCell>{remainingToEnter.map(item => `${item.assetName}: ${item.remaining}`).join(', ')}</TableCell>
                <TableCell style={{ width: '200px' }} title={transaction.notes}>{transaction.notes.length > 30 ? `${transaction.notes.substring(0, 30)}...` : transaction.notes}</TableCell>
                <TableCell><button className="icon-button"><i className="icon-eye"></i></button></TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {totalTransactions > transactionsPerPage && (
        <div className="pagination-buttons">
          {Array.from({ length: totalPages }, (_, index) => (
            <button
              key={index}
              onClick={() => handlePageChange(index + 1)}
              className={currentPage === index + 1 ? 'active' : ''}
            >
              {index + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
} 
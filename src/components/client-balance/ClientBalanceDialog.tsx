// src/components/client-balance/ClientBalanceDialog.tsx
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Spinner } from '../ui/spinner';
import { clientService } from '@/services/api';
import { ClientBalanceResponse } from '@/models/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Button } from '../ui/button';

interface ClientBalanceDialogProps {
  clientId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ClientBalanceDialog: React.FC<ClientBalanceDialogProps> = ({ clientId, isOpen, onClose }) => {
  const [clientBalance, setClientBalance] = useState<ClientBalanceResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      clientService.getClientBalance(clientId)
        .then((data) => {
          setClientBalance(data);
          setIsLoading(false);
        })
        .catch(() => {
          setIsLoading(false);
        });
    }
  }, [clientId, isOpen]);

  const downloadCSV = () => {
    if (!clientBalance) return;

    const headers = ['Activo', 'Descripción', 'Tipo', 'Balance'];
    const rows = clientBalance.data.balances.map((balance) => [
      balance.asset.name,
      balance.asset.description,
      balance.asset.type === 'PHYSICAL' ? 'Físico' : 'Digital',
      balance.balance,
    ]);

    const csvContent = [
      '\uFEFF', // Añadir BOM para UTF-8
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    const date = new Date();
    const formattedDate = date.toISOString().replace(/[-:]/g, '').split('.')[0];
    link.setAttribute('download', `${clientBalance.data.client.name}-${formattedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className='text-2xl font-bold text-gray-800'>
            Cuenta Corriente: {clientBalance?.data.client.name}
          </DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <Spinner size="lg" />
          </div>
        ) : (
          <div>
            <Table className="w-full mt-4">
              <TableHeader>
                <TableRow>
                  <TableHead>Activo</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientBalance?.data.balances.map((balance) => (
                  <TableRow key={balance.asset.id}>
                    <TableCell>{balance.asset.name}</TableCell>
                    <TableCell>{balance.asset.description}</TableCell>
                    <TableCell>{balance.asset.type === 'PHYSICAL' ? 'Físico' : 'Digital'}</TableCell>
                    <TableCell>${balance.balance}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4">
              <Button
                onClick={downloadCSV}
                className='bg-primary text-white border'
              >
                Descargar Reporte (.csv)
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
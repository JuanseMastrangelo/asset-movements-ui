import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { assetService, transactionsService } from '../services/api';
import { TransactionDetail, Conciliation } from '../models/transaction';
import { Checkbox } from '../components/ui/checkbox';
import { Asset } from '@/models';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { HandshakeIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Conciliations() {
  const queryClient = useQueryClient();

  const { data: conciliationsData, isLoading } = useQuery<any>({
    queryKey: ['conciliations'],
    queryFn: async () => {
      const response = await transactionsService.conciliations();
      return response;
    }
  });

  const { data: assetsData, isLoading: isLoadingAssets } = useQuery<Asset[]>({
    queryKey: ['assets'],
    queryFn: async () => {
      const response = await assetService.getAll();
      return response.data;
    }
  });

  const [selectedTransactions, setSelectedTransactions] = useState<(Conciliation | Asset)[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [disabledSection, setDisabledSection] = useState<string | null>(null);
  const [amountsInSection, setAmountsInSection] = useState<Record<string, number>>({});
  const [note, setNote] = useState<string>("");

  useEffect(() => {
    const selectedTypes = new Set(selectedTransactions.map(transaction => {
      if ('details' in transaction) {
        return transaction.details.some(detail => detail.asset.name === 'Cable traer') ? 'Cable Traer' :
               transaction.details.some(detail => detail.asset.name === 'Cable llevar') ? 'Cable Llevar' :
               'Cuenta Madre';
      } else {
        return 'Cuenta Madre';
      }
    }));

    if (selectedTypes.size === 2) {
      // Si hay dos tipos seleccionados, deshabilitar la tercera sección
      const allSections = ['Cable Traer', 'Cable Llevar', 'Cuenta Madre'];
      const sectionsToDisable = allSections.filter(section => !selectedTypes.has(section as 'Cable Traer' | 'Cable Llevar' | 'Cuenta Madre'));
      setDisabledSection(sectionsToDisable[0]);
    } else {
      setDisabledSection(null);
    }
  }, [selectedTransactions]);

  const handleCheckboxChange = (transaction: Conciliation | Asset) => {
    setSelectedTransactions((prev) => {
      if (prev.includes(transaction)) {
        return prev.filter((t) => t !== transaction);
      } else {
        return [...prev, transaction];
      }
    });
  };

  const handleAmountChange = (transactionId: string, value: number) => {
    setAmountsInSection((prev) => ({
      ...prev,
      [transactionId]: value,
    }));
  };

  const isAmountValid = (transactionId: string, value: number) => {
    const transaction = selectedTransactions.find(t => ('details' in t ? t.id : t.name) === transactionId);
    const maxAmount = transaction && 'details' in transaction
      ? transaction.details.reduce((sum, detail) => sum + detail.amount, 0)
      : 0;

    return value >= 0 && value <= maxAmount;
  };

  const canConciliate = () => {
        const selectedTypes = new Set(selectedTransactions.map(transaction => {
      if ('details' in transaction) {
        return transaction.details.some(detail => detail.asset.name === 'Cable traer') ? 'Cable Traer' :
               transaction.details.some(detail => detail.asset.name === 'Cable llevar') ? 'Cable Llevar' :
               'Cuenta Madre';
      } else {
        return 'Cuenta Madre'; // Asumimos que si no tiene 'details', es un 'Asset' de tipo 'Cuenta Madre'
      }
    }));

    return selectedTypes.size === 2;
  };

  const canConciliateDialog = () => {
    const totalInSection1 = Object.entries(amountsInSection)
      .filter(([transactionId]) => {
        const transaction = selectedTransactions.find(t => ('details' in t ? t.id : t.name) === transactionId);
        return transaction && 'details' in transaction && transaction.details.some(detail => detail.asset.name === 'Cable traer');
      })
      .reduce((acc, [, val]) => acc + val, 0);

    const totalInSection2 = Object.entries(amountsInSection)
      .filter(([transactionId]) => {
        const transaction = selectedTransactions.find(t => ('details' in t ? t.id : t.name) === transactionId);
        return transaction && 'details' in transaction && transaction.details.some(detail => detail.asset.name === 'Cable llevar');
      })
      .reduce((acc, [, val]) => acc + val, 0);

    // Verificar que haya al menos un monto mayor que cero en ambas secciones
    return totalInSection1 > 0 && totalInSection2 > 0 && totalInSection2 <= totalInSection1;
  };

  const handleConciliate = async () => {
    const clientTransactions = Object.entries(amountsInSection)
      .filter(([, amount]) => amount > 0) // Solo incluir transacciones con montos mayores a cero
      .map(([transactionId, amount]) => {
        const transaction = selectedTransactions.find(t => ('details' in t ? t.id : t.name) === transactionId);
        if (transaction && 'details' in transaction) {
          const isIncome = transaction.details.some(detail => detail.asset.name === 'Cable traer');
          return {
            clientId: transaction.client.id,
            assetId: transaction.details[0].asset.id, // Asumimos que cada transacción tiene al menos un detalle
            movementType: isIncome ?'EXPENSE' : 'INCOME',
            amount: amount,
            notes: note ? note : isIncome ? 'Cable traer del exterior' : `Cable llevar para ${transaction.client.name}`
          };
        }
        return null;
      })
      .filter(Boolean); // Eliminar cualquier valor nulo

    const body = {
      clientTransactions,
      notes: note || "Operación de pase de mano Cable traer/llevar"
    };

    try {
      await transactionsService.conciliateImmutableAssets(body);
      toast.success("Conciliación realizada con éxito");
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['conciliations'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    } catch (error) {
      toast.error("Error al realizar la conciliación");
    }
  };

  const totalInSection1 = Object.entries(amountsInSection)
    .filter(([transactionId]) => {
      const transaction = selectedTransactions.find(t => ('details' in t ? t.id : t.name) === transactionId);
      return transaction && 'details' in transaction && transaction.details.some(detail => detail.asset.name === 'Cable traer');
    })
    .reduce((acc, [, val]) => acc + val, 0);

  const totalInSection2 = Object.entries(amountsInSection)
    .filter(([transactionId]) => {
      const transaction = selectedTransactions.find(t => ('details' in t ? t.id : t.name) === transactionId);
      return transaction && 'details' in transaction && transaction.details.some(detail => detail.asset.name === 'Cable llevar');
    })
    .reduce((acc, [, val]) => acc + val, 0);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Conciliar Operaciones</h1>
      <div className="flex justify-between gap-5">
        <div className="border rounded-lg w-full">
          <h2 className="text-xl font-semibold px-4 pt-4">Cable Traer</h2>
          <Table>
            <TableBody>
              <TableRow className='hover:bg-white'>
                <TableCell className='hover:bg-white'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead className='text-center'>Transacción</TableHead>
                        <TableHead>Monto</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={2} className="text-center py-8">
                            Cargando conciliaciones...
                          </TableCell>
                        </TableRow>
                      ) : (
                        conciliationsData?.data.transactions
                          .filter((transaction: Conciliation) => transaction.details.some((detail: TransactionDetail) => detail.asset.name === 'Cable traer' && detail.movementType === 'INCOME') && transaction.state !== 'COMPLETED')
                          .map((transaction: Conciliation, index: number) => (
                            <TableRow key={index}>
                              <TableCell>
                                <div className="flex items-center">
                                  <Checkbox
                                    id={`checkbox-Cable Traer-${index}`}
                                    onCheckedChange={() => handleCheckboxChange(transaction)}
                                    disabled={disabledSection === 'Cable Traer'}
                                  />
                                  <label htmlFor={`checkbox-Cable Traer-${index}`} className="ml-2">
                                    {transaction.client.name}
                                  </label>
                                </div>
                              </TableCell>
                              <TableCell className='text-center'>
                                <Link target='_blank' to={`/transactions/${transaction.details[0].transactionId}`} className="text-blue-500" title="Ver transacción padre">
                                  Link
                                </Link>
                              </TableCell>
                              <TableCell>${transaction.details.filter((detail: TransactionDetail) => detail.asset.name === 'Cable traer' && detail.movementType === 'INCOME').reduce((total: number, detail: TransactionDetail) => total + detail.amount, 0)}</TableCell>
                            </TableRow>
                          ))
                      )}
                    </TableBody>
                  </Table>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <div className="border rounded-lg w-full">
          <h2 className="text-xl font-semibold px-4 pt-4">Cuentas Madre</h2>
          <Table>
            <TableBody>
              <TableRow className='hover:bg-white'>
                <TableCell className='hover:bg-white'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Monto</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingAssets ? (
                        <TableRow>
                          <TableCell colSpan={2} className="text-center py-8">
                            Cargando cuentas madres...
                          </TableCell>
                        </TableRow>
                      ) : (
                        assetsData?.filter((asset: Asset) => asset.isMtherAccount)
                          .map((asset: Asset, index: number) => (
                            <TableRow key={index}>
                              <TableCell>
                                <div className="flex items-center">
                                  <Checkbox
                                    id={`checkbox-Cuenta Madre-${index}`}
                                    onCheckedChange={() => handleCheckboxChange(asset)}
                                    disabled={disabledSection === 'Cuenta Madre'}
                                  />
                                  <label htmlFor={`checkbox-Cuenta Madre-${index}`} className="ml-2">
                                    {asset.name}
                                  </label>
                                </div>
                              </TableCell>
                              <TableCell>$1000</TableCell>
                            </TableRow>
                          ))
                      )}
                    </TableBody>
                  </Table>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <div className="border rounded-lg w-full">
          <h2 className="text-xl font-semibold px-4 pt-4">Cable Llevar</h2>
          <Table>
            <TableBody>
              <TableRow className='hover:bg-white'>
                <TableCell className='hover:bg-white'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead className='text-center'>Transacción</TableHead>
                        <TableHead>Monto</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={2} className="text-center py-8">
                            Cargando conciliaciones...
                          </TableCell>
                        </TableRow>
                      ) : (
                        conciliationsData?.data.transactions
                          .filter((transaction: Conciliation) => transaction.details.some((detail: TransactionDetail) => detail.asset.name === 'Cable llevar' && detail.movementType === 'EXPENSE') && transaction.state !== 'COMPLETED')
                          .map((transaction: Conciliation, index: number) => (
                            <TableRow key={index}>
                              <TableCell>
                                <div className="flex items-center">
                                  <Checkbox
                                    id={`checkbox-Cable Llevar-${index}`}
                                    onCheckedChange={() => handleCheckboxChange(transaction)}
                                    disabled={disabledSection === 'Cable Llevar'}
                                  />
                                  <label htmlFor={`checkbox-Cable Llevar-${index}`} className="ml-2">
                                    {transaction.client.name}
                                  </label>
                                </div>
                              </TableCell>
                              <TableCell className='text-center'>
                                <Link target='_blank' to={`/transactions/${transaction.details[0].transactionId}`} className="text-blue-500" title="Ver transacción padre">
                                  Link
                                </Link>
                              </TableCell>
                              <TableCell>${transaction.details.filter((detail: TransactionDetail) => detail.asset.name === 'Cable llevar' && detail.movementType === 'EXPENSE').reduce((total: number, detail: TransactionDetail) => total + detail.amount, 0)}</TableCell>
                            </TableRow>
                          ))
                      )}
                    </TableBody>
                  </Table>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
      <div className="mt-4 flex justify-center">
        <Button
          onClick={() => setIsDialogOpen(true)}
          disabled={!canConciliate()}
          variant="default"
        >
          <HandshakeIcon className="w-4 h-4 mr-2" />
          Conciliar Transacciones
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent style={{ width: '80%', maxWidth: '80%' }}>
          <DialogHeader>
            <DialogTitle>Conciliar Transacciones - Carga de valores</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {['Cable Traer', 'Cuentas Madre', 'Cable Llevar'].map((section) => {
              const transactionsInSection = selectedTransactions.filter(transaction => {
                if ('details' in transaction) {
                  return transaction.details.some(detail => {
                    if (section === 'Cable Traer') return detail.asset.name === 'Cable traer' && detail.movementType === 'INCOME';
                    if (section === 'Cable Llevar') return detail.asset.name === 'Cable llevar' && detail.movementType === 'EXPENSE';
                    return false;
                  });
                } else {
                  return section === 'Cuentas Madre';
                }
              });

              if (transactionsInSection.length > 0) {
                return (
                  <div key={section} className="space-y-2">
                    <h3 className="font-semibold">{section}</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Monto</TableHead>
                          <TableHead>Ingresar Monto</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {
                        transactionsInSection.map((transaction, index) => {
                          const transactionId = 'details' in transaction ? transaction.id : transaction.name;
                          const amount = section === 'Cable Traer' ? 'details' in transaction ? transaction.details.filter((detail: TransactionDetail) => detail.asset.name === 'Cable traer' && detail.movementType === 'INCOME').reduce((total: number, detail: TransactionDetail) => total + detail.amount, 0) : 0 :
                          section === 'Cable Llevar' ? 'details' in transaction ? transaction.details.filter((detail: TransactionDetail) => detail.asset.name === 'Cable llevar' && detail.movementType === 'EXPENSE').reduce((total: number, detail: TransactionDetail) => total + detail.amount, 0) : 0 :
                          0;
                          return (
                            <TableRow key={index}>
                              <TableCell className='w-1/2'>{'details' in transaction ? transaction.client.name : transaction.name}</TableCell>
                              <TableCell className='w-3/12'>${amount}</TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.01"
                                  max={amount}
                                  placeholder="Monto"
                                  className="w-24"
                                  onChange={(e) => handleAmountChange(transactionId, parseFloat(e.target.value))}
                                  value={amountsInSection[transactionId] || ''}
                                />
                                {!isAmountValid(transactionId, amountsInSection[transactionId] || 0) && (
                                  <span className="text-red-500">Monto inválido</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                );
              }
              return null;
            })}
          </div>
          <div className="mt-4">
            <h4>Resumen de la Operación</h4>
            <p>Resta para completar el total: {totalInSection1 - totalInSection2}</p>
            <Textarea
              placeholder="Notas adicionales"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full mt-2"
            />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleConciliate} disabled={!canConciliateDialog()}>Conciliar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

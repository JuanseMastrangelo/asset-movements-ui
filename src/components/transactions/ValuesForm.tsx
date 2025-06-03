import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { api, transactionsService, denominationsService } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Denomination } from "@/models/denomination";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X, TrendingUp, TrendingDown, Clock, Upload, InfoIcon, CheckCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface BillRow {
  count: string;
  billValue: string; // Valor de la denominación
  denominationId: string; // ID de la denominación
  receivedDate: string;
  movementType: string;
  quantity: number;
}

interface ValuesFormProps {
  onComplete: (redirectToLogistics: boolean) => void;
}

const ValuesForm: React.FC<ValuesFormProps> = ({ onComplete }) => {
  const params = useParams();
  const [ingressRows, setIngressRows] = useState<BillRow[]>([{ count: "", billValue: "", denominationId: "", receivedDate: "", movementType: "", quantity: 0 }]);
  const [egressRows, setEgressRows] = useState<BillRow[]>([{ count: "", billValue: "", denominationId: "", receivedDate: "", movementType: "", quantity: 0 }]);
  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [note, setNote] = useState<string>("");

  // const CABLE_TRAER_ASSET_ID = import.meta.env.VITE_CABLE_TRAER_ASSET_ID;
  // const CABLE_LLEVAR_ASSET_ID = import.meta.env.VITE_CABLE_LLEVAR_ASSET_ID;

  const { data: transactionDetails, isLoading: isLoadingTransaction, error: transactionError, refetch: refetchTransactionDetails } = useQuery({
    queryKey: ["transaction", params.id],
    queryFn: async () => {
      if (!params.id) throw new Error("No transaction ID provided");
      return transactionsService.getOne(params.id);
    },
    refetchOnWindowFocus: false,
    refetchInterval: false,
    enabled: !!params.id,
  });

  if (transactionError) {
    toast.error("Error al cargar los detalles de la transacción");
    window.location.href = "/transactions";
  }

  const { data: denominations, isLoading: isLoadingDenominations } = useQuery<Denomination[], Error>({
    queryKey: ["denominations"],
    queryFn: async () => {
      return denominationsService.getAll();
    },
  });

  if (isLoadingTransaction || isLoadingDenominations) {
    return <Spinner />;
  }

  const IngressData = transactionDetails?.details?.find(
    (detail) => detail.movementType === "INCOME"
  );
  const EgressData = transactionDetails?.details?.find(
    (detail) => detail.movementType === "EXPENSE"
  );
  const allowedIngressTotal = IngressData?.amount || 0;
  const allowedEgressTotal = EgressData?.amount || 0;

  const ingressAssetId = IngressData?.assetId || "";
  const egressAssetId = EgressData?.assetId || "";

  const filteredIngressDenominations = denominations?.filter((d: Denomination) => d.assetId === ingressAssetId) || [];
  const filteredEgressDenominations = denominations?.filter((d: Denomination) => d.assetId === egressAssetId) || [];

  const billDetailsIncome = transactionDetails?.details.find((detail) => detail.movementType === "INCOME")?.billDetails || [];
  const billDetailsEgress = transactionDetails?.details.find((detail) => detail.movementType === "EXPENSE")?.billDetails || [];
  
  const childTransactions = transactionDetails?.childTransactions || [];

  const pendingIngress = allowedIngressTotal - childTransactions
    .flatMap(transaction => transaction.details)
    .filter(detail => detail.movementType === "INCOME")
    .reduce((total, detail) => total + detail.amount, 0);

  const pendingEgress = allowedEgressTotal - childTransactions
    .flatMap(transaction => transaction.details)
    .filter(detail => detail.movementType === "EXPENSE")
    .reduce((total, detail) => total + detail.amount, 0);

  // const isCompleted = transactionDetails?.state === "COMPLETED";
  
  // const hasCableTraer = transactionDetails?.details.some(detail => detail.asset.id === CABLE_TRAER_ASSET_ID);
  // const hasCableLlevar = transactionDetails?.details.some(detail => detail.asset.id === CABLE_LLEVAR_ASSET_ID);


  // Calculate total amount for a set of rows
  const calculateTotal = (rows: BillRow[]): number =>
    rows.reduce((total, row) => {
      const count = parseFloat(row.count);
      const value = parseFloat(row.billValue);
      return !isNaN(count) && !isNaN(value) ? total + count * value : total;
    }, 0);

  // Check if last row is complete (both inputs filled)
  const canAddRow = (rows: BillRow[]): boolean => {
    const lastRow = rows[rows.length - 1];
    return lastRow.count !== "" && lastRow.billValue !== "";
  };

  // Add new row if last row is complete
  const addIngressRow = () => {
    if (canAddRow(ingressRows)) {
      setIngressRows([...ingressRows, { count: "", billValue: "", denominationId: "", receivedDate: "", movementType: "", quantity: 0 }]);
    }
  };

  const addEgressRow = () => {
    if (canAddRow(egressRows)) {
      setEgressRows([...egressRows, { count: "", billValue: "", denominationId: "", receivedDate: "", movementType: "", quantity: 0 }]);
    }
  };

  const handleIngressChange = (index: number, values: { count: string; billValue: string; denominationId: string }) => {
    const updatedRows = [...ingressRows];
    updatedRows[index] = { ...updatedRows[index], ...values };
    setIngressRows(updatedRows);
  };

  const handleEgressChange = (index: number, values: { count: string; billValue: string; denominationId: string }) => {
    const updatedRows = [...egressRows];
    updatedRows[index] = { ...updatedRows[index], ...values };
    setEgressRows(updatedRows);
  };

  const handleRemoveIngressRow = (index: number) => {
    const updatedRows = [...ingressRows];
    if (ingressRows.length === 1) {
      updatedRows[index] = { count: "", billValue: "", denominationId: "", receivedDate: "", movementType: "", quantity: 0 };
    } else {
      updatedRows.splice(index, 1);
    }
    setIngressRows(updatedRows);
  };

  const handleRemoveEgressRow = (index: number) => {
    const updatedRows = [...egressRows];
    if (egressRows.length === 1) {
      updatedRows[index] = { count: "", billValue: "", denominationId: "", receivedDate: "", movementType: "", quantity: 0 };
    } else {
      updatedRows.splice(index, 1);
    }
    setEgressRows(updatedRows);
  };

  // const allRowsComplete = (rows: BillRow[]): boolean =>
  //   rows.every((row) => row.count !== "" && row.billValue !== "");

  // Handle submission (PATCH transaction state to CURRENT_ACCOUNT)
  const handleSubmit = async (redirectToLogistics: boolean) => {

    const ingressTotal = calculateTotal(ingressRows);
    const egressTotal = calculateTotal(egressRows);

    if (ingressTotal > allowedIngressTotal) {
      setError(`El total de ingresos (${ingressTotal}) supera lo permitido (${allowedIngressTotal}).`);
      return;
    }
    if (egressTotal > allowedEgressTotal) {
      setError(`El total de egresos (${egressTotal}) supera lo permitido (${allowedEgressTotal}).`);
      return;
    }

    setError("");
    setIsSubmitting(true);

    const ingressNewBillDetails = ingressRows.length > 0 && ingressRows.every(row => row.count !== "" && row.billValue !== "") ? ingressRows.map(row => ({
      denominationId: row.denominationId,
      quantity: parseInt(row.count, 10),
      receivedDate: new Date().toISOString(),
    })) : [];

    const egressNewBillDetails = egressRows.length > 0 && egressRows.every(row => row.count !== "" && row.billValue !== "") ? egressRows.map(row => ({
      denominationId: row.denominationId,
      quantity: parseInt(row.count, 10),
      receivedDate: new Date().toISOString(),
    })) : [];

    const ingressBody = {
      assetId: ingressAssetId,
      amount: ingressRows.reduce((total, row) => total + (+row.count * +row.billValue), 0),
      movementType: "INCOME",
      billDetails: ingressNewBillDetails
    }

    const egressBody = {
      assetId: egressAssetId,
      amount:  egressRows.reduce((total, row) => total + (+row.count * +row.billValue), 0),
      movementType: "EXPENSE",
      billDetails: egressNewBillDetails
    }

    const details = [];
    if (ingressRows.length > 0 && ingressRows.every(row => row.count !== "" && row.billValue !== "")) details.push(ingressBody);
    if (egressRows.length > 0 && egressRows.every(row => row.count !== "" && row.billValue !== "")) details.push(egressBody);

    try {
      const body = {
        clientId: transactionDetails?.clientId,
        state: "CURRENT_ACCOUNT",
        notes: note,
        details: details,
      };
      await api.post(`transactions/${params.id}/child`, body);
      onComplete(redirectToLogistics);
      if (!redirectToLogistics) {
        refetchTransactionDetails();
      }
      setIngressRows([{ count: "", billValue: "", denominationId: "", receivedDate: "", movementType: "", quantity: 0 }]);
      setEgressRows([{ count: "", billValue: "", denominationId: "", receivedDate: "", movementType: "", quantity: 0 }]);
      setNote("");
      toast.success("Ingresos y egresos agregados correctamente.");
    } catch (err) {
      console.log(err);
      setError("Error al cerrar la operación.");
    } finally {
      setIsSubmitting(false);
    }
  };

  console.log(transactionDetails)

  return (
    <>
      <div className="mb-4 text-sm border-b pb-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={`https://avatar.vercel.sh/${transactionDetails?.client.email}`} alt={transactionDetails?.client.name} />
            <AvatarFallback>{transactionDetails?.client.name.split(' ').map(n => n[0]).join('').toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-semibold">{transactionDetails?.client.name}</span>
            <span className="text-muted-foreground">{transactionDetails?.client.email}</span>
          </div>
        </div>
      </div>

      {
        transactionDetails?.notes && (
          <div className="mb-4 text-sm pb-4 flex flex-col gap-2 bg-amber-100 p-4 text-black">
            <span className="flex items-center gap-1"><InfoIcon className="w-4 h-4 text-amber-800" /> Nota General:</span>
            <span>{transactionDetails?.notes}</span>
          </div>
        )
      }
      <div className="min-h-screen">
        <div className="mx-auto max-w-7xl space-y-6">

          {
            transactionDetails?.state !== "COMPLETED" ? (
              <>
                {/* Main Transaction Forms */}
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Income Section */}
                  <Card className="bg-white dark:bg-gray-800 rounded-lg border">
                    <CardHeader className="bg-green-50 border-b rounded-t-lg">
                      <CardTitle className="flex items-center gap-2 text-green-800">
                        <TrendingUp className="h-5 w-5" />
                        Ingreso ({IngressData?.asset.name})
                      </CardTitle>
                      <CardDescription>Registra los ingresos en ({IngressData?.asset.name})</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                      {ingressRows.map((row, index) => (
                        <div key={`ingress-${index}`} className="flex gap-3 items-end">
                          <div className="flex-1">
                            <Label htmlFor={`income-amount-${index}`} className="text-sm font-medium">
                              Cantidad
                            </Label>
                            <Input
                              id={`income-amount-${index}`}
                              type="number"
                              placeholder="0.00"
                              value={row.count}
                              onChange={(e) => handleIngressChange(index, { count: e.target.value, billValue: row.billValue, denominationId: row.denominationId })}
                              className="mt-1"
                              min={0}
                            />
                          </div>
                          <div className="flex-1">
                            <Label htmlFor={`income-denomination-${index}`} className="text-sm font-medium">
                              Denominación
                            </Label>
                            <Select onValueChange={(value) => {
                              const [denominationId, billValue] = value.split("|");
                              handleIngressChange(index, { count: row.count, denominationId, billValue });
                            }} value={`${row.denominationId}|${row.billValue}`}> 
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Seleccionar denominación" />
                              </SelectTrigger>
                              <SelectContent>
                                {filteredIngressDenominations.map((denomination) => (
                                  <SelectItem key={denomination.id} value={`${denomination.id}|${denomination.value.toString()}`}>
                                    {denomination.value}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {ingressRows.length > 1 && (
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleRemoveIngressRow(index)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                          {/* <div className="ml-2 text-sm">
                            {row.count && row.billValue && (
                              <>
                                {row.count} x {row.billValue} = {parseFloat(row.count) * parseFloat(row.billValue)}
                              </>
                            )}
                          </div> */}
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        onClick={addIngressRow}
                        className="w-full border-dashed bg-gray-50"
                        disabled={!canAddRow(ingressRows)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar fila
                      </Button>
                      <div className="mt-6 py-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-medium">Total Nuevo Ingreso:</span>
                          <span className="font-bold">${calculateTotal(ingressRows).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm mt-1">
                          <span>Restante:</span>
                          <span className="font-semibold">${pendingIngress - billDetailsIncome.reduce((total, detail) => total + (detail.quantity * detail.denomination.value), 0) - calculateTotal(ingressRows)}</span>
                        </div>
                        {(pendingIngress - billDetailsIncome.reduce((total, detail) => total + (detail.quantity * detail.denomination.value), 0) - calculateTotal(ingressRows) < 0) && (
                          <div className="text-red-500 text-sm">El total de ingresos supera lo permitido.</div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Expense Section */}
                  <Card className=" bg-white dark:bg-gray-800 rounded-lg border">
                    <CardHeader className="bg-red-50 border-b rounded-t-lg">
                      <CardTitle className="flex items-center gap-2 text-red-800">
                        <TrendingDown className="h-5 w-5" />
                        Egreso ({EgressData?.asset.name})
                      </CardTitle>
                      <CardDescription>Registra los egresos en {EgressData?.asset.name}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                      {egressRows.map((row, index) => (
                        <div key={`egress-${index}`} className="flex gap-3 items-end">
                          <div className="flex-1">
                            <Label htmlFor={`expense-amount-${index}`} className="text-sm font-medium">
                              Cantidad
                            </Label>
                            <Input
                              id={`expense-amount-${index}`}
                              type="number"
                              placeholder="0.00"
                              value={row.count}
                              onChange={(e) => handleEgressChange(index, { count: e.target.value, billValue: row.billValue, denominationId: row.denominationId })}
                              className="mt-1" 
                              min={0}
                            />
                          </div>
                          <div className="flex-1">
                            <Label htmlFor={`expense-denomination-${index}`} className="text-sm font-medium">
                              Denominación
                            </Label>
                            <Select onValueChange={(value) => {
                              const [denominationId, billValue] = value.split("|");
                              handleEgressChange(index, { count: row.count, denominationId, billValue });
                            }} value={`${row.denominationId}|${row.billValue}`}> 
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Seleccionar denominación" />
                              </SelectTrigger>
                              <SelectContent>
                                {filteredEgressDenominations.map((denomination) => (
                                  <SelectItem key={denomination.id} value={`${denomination.id}|${denomination.value.toString()}`}>
                                    {denomination.value}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {egressRows.length > 1 && (
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleRemoveEgressRow(index)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                          {/* <div className="ml-2 text-sm">
                            {row.count && row.billValue && (
                              <>
                                {row.count} x {row.billValue} = {parseFloat(row.count) * parseFloat(row.billValue)}
                              </>
                            )}
                          </div> */}
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        onClick={addEgressRow}
                        className="w-full border-dashed bg-gray-50"
                        disabled={!canAddRow(egressRows)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar fila
                      </Button>
                      <div className="mt-6 py-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-medium">Total Nuevo Egreso:</span>
                          <span className="font-bold">${calculateTotal(egressRows).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm mt-1">
                          <span>Restante:</span>
                          <span className="font-semibold">${pendingEgress - billDetailsEgress.reduce((total, detail) => total + (detail.quantity * detail.denomination.value), 0) - calculateTotal(egressRows)}</span>
                        </div>
                        {(pendingEgress - billDetailsEgress.reduce((total, detail) => total + (detail.quantity * detail.denomination.value), 0) - calculateTotal(egressRows) < 0) && (
                          <div className="text-red-500 text-sm">El total de egreso supera lo permitido.</div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Transaction Notes */}
                <Card className="bg-white dark:bg-gray-800 rounded-lg border">
                  <CardHeader>
                    <CardTitle className="text-gray-800 dark:text-white">Nota de la Transacción</CardTitle>
                    <CardDescription>Agrega detalles adicionales sobre esta transacción</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="Agregar una nota..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="min-h-[100px] resize-none"
                    />
                  </CardContent>
                </Card>

                
                {/* Action Buttons */}
                <div className="flex gap-4 justify-end">
                  <Button size="lg" className="w-full py-5 text-xl" onClick={() => handleSubmit(false)}
                  disabled={isSubmitting || (Number(calculateTotal(ingressRows).toFixed(2)) === 0 && Number(calculateTotal(egressRows).toFixed(2)) === 0)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Realizar Carga de valores
                  </Button>
                  {error && <div className="text-red-500 text-sm">{error}</div>}
                </div>
              </>
            ) : (
              <div className="flex justify-center flex-col items-center gap-2">
                <div className="flex items-center gap-2 py-4 bg-green-500 px-4 rounded-lg text-white">
                  <CheckCircle className="h-7 w-7 mr-2" />
                  <p className="text-lg font-medium   flex items-center gap-2">
                    Transacción completada
                  </p>
                </div>
                <p>Finalizada el {format(new Date(transactionDetails.updatedAt), "dd/MM/yyyy HH:mm", { locale: es })}</p>
              </div>
            )
          }

          {/* General Summary */}
          <Card className="bg-white dark:bg-gray-800 rounded-lg mt-24 border">
            <CardHeader>
              <CardTitle className="text-gray-800 dark:text-white">Resumen General</CardTitle>
              <CardDescription>Estado actual de las transacciones</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-white">Tipo</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-white">Valor esperado</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-white">Completado</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-white">Pendiente</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-green-600" />
                          <span className="font-medium">Ingreso ({IngressData?.asset.name})</span>
                        </div>
                      </td>
                      <td className="text-right py-4 px-4 font-semibold text-green-600">${allowedIngressTotal}</td>
                      <td className="text-right py-4 px-4 text-gray-600 dark:text-white">${childTransactions.flatMap(transaction => transaction.details).filter(detail => detail.movementType === "INCOME").reduce((total, detail) => total + detail.amount, 0)}</td>
                      <td className="text-right py-4 px-4 font-semibold text-green-600">${pendingIngress}</td>
                    </tr>
                    <tr className="border-b border-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <TrendingDown className="h-4 w-4 text-red-600" />
                          <span className="font-medium">Egreso ({EgressData?.asset.name})</span>
                        </div>
                      </td>
                      <td className="text-right py-4 px-4 font-semibold text-red-600">${allowedEgressTotal}</td>
                      <td className="text-right py-4 px-4 text-gray-600 dark:text-white">${childTransactions.flatMap(transaction => transaction.details).filter(detail => detail.movementType === "EXPENSE").reduce((total, detail) => total + detail.amount, 0)}</td>
                      <td className="text-right py-4 px-4 font-semibold text-red-600">${pendingEgress}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Movement Summary */}
          <Card className="bg-white dark:bg-gray-800 rounded-lg border">
            <CardHeader>
              <CardTitle className="text-gray-800 dark:text-white">Resumen de Movimientos</CardTitle>
              <CardDescription>Historial de transacciones anteriores</CardDescription>
            </CardHeader>
            <CardContent>
              {childTransactions.length > 0 ? (
                <Table className="min-w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>Nota</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {childTransactions
                      .flatMap((transaction) => transaction.details.map((detail) => ({
                        ...detail,
                        date: transaction.date,
                        notes: transaction.notes
                      })))
                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .map((detail, index) => (
                        <TableRow key={index} className="border-t">
                          <TableCell className="text-left py-2">{new Date(detail.date).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}</TableCell>
                          <TableCell className="text-left py-2">
                            <Badge
                              variant={detail.movementType === "INCOME" ? "success" : "destructive"}
                              style={{
                                backgroundColor: "#FFFFFF",
                                borderColor: detail.movementType === "INCOME" ? "#28a745" : "#dc3545",
                                color: detail.movementType === "INCOME" ? "#28a745" : "#dc3545",
                                borderWidth: "1px",
                                borderStyle: "solid"
                              }}
                            >
                              {detail.movementType === "INCOME" ? "Ingreso" : "Egreso"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-left py-2">$ {detail.amount} {transactionDetails?.details.find((d) => d.assetId === detail.assetId)?.asset.name}</TableCell>
                          <TableCell className="text-left py-2">{detail.notes}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-lg font-medium">No hay movimientos previos</p>
                  <p className="text-sm">Los movimientos aparecerán aquí una vez que se procesen las transacciones</p>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </>
  );
};

export default ValuesForm;

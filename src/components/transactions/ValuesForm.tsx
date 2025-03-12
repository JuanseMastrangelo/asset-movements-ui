import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface BillRow {
  count: string;
  billValue: string;
}

interface ValuesFormProps {
  transactionId: string;
  allowedIngressTotal: number;
  allowedEgressTotal: number;
  operationType: "Physic" | "Virtual";
  ingressAssetName: string;
  egressAssetName: string;
}

const ValuesForm: React.FC<ValuesFormProps> = ({
  transactionId,
  allowedIngressTotal,
  allowedEgressTotal,
  operationType,
  ingressAssetName,
  egressAssetName,
}) => {
  const navigate = useNavigate();
  const [ingressRows, setIngressRows] = useState<BillRow[]>([{ count: "", billValue: "" }]);
  const [egressRows, setEgressRows] = useState<BillRow[]>([{ count: "", billValue: "" }]);
  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

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
      setIngressRows([...ingressRows, { count: "", billValue: "" }]);
    }
  };

  const addEgressRow = () => {
    if (canAddRow(egressRows)) {
      setEgressRows([...egressRows, { count: "", billValue: "" }]);
    }
  };

  const handleIngressChange = (index: number, field: "count" | "billValue", value: string) => {
    const updatedRows = [...ingressRows];
    updatedRows[index] = { ...updatedRows[index], [field]: value };
    setIngressRows(updatedRows);
  };

  const handleEgressChange = (index: number, field: "count" | "billValue", value: string) => {
    const updatedRows = [...egressRows];
    updatedRows[index] = { ...updatedRows[index], [field]: value };
    setEgressRows(updatedRows);
  };

  const allRowsComplete = (rows: BillRow[]): boolean =>
    rows.every((row) => row.count !== "" && row.billValue !== "");

  // Handle submission (PATCH transaction state to CURRENT_ACCOUNT)
  const handleSubmit = async (redirectToLogistics: boolean) => {
    if (!allRowsComplete(ingressRows) || !allRowsComplete(egressRows)) {
      setError("Por favor, complete todos los campos.");
      return;
    }

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
    try {
      await api.patch(`transactions/${transactionId}`, { state: "CURRENT_ACCOUNT" });
      if (redirectToLogistics) {
        navigate("/transactions/step4");
      } else {
        navigate("/transactions");
      }
    } catch (err) {
      setError("Error al cerrar la operación.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Disable functionality if operation type is Virtual
  const isDisabled = operationType !== "Physic";

  return (
    <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
      {isDisabled && (
        <div className="text-red-500">
          Esta funcionalidad está deshabilitada para operaciones virtuales.
        </div>
      )}
      <div className="flex border rounded">
        {/* Ingreso Section */}
        <div className="flex-1 p-4 border-r">
          <div className="mb-2 font-semibold">Ingreso</div>
          {/* Header for columns */}
          <div className="flex text-sm font-medium">
            <div className="w-1/2">Cantidad</div>
            <div className="w-1/2">Monto</div>
          </div>
          {ingressRows.map((row, index) => (
            <div key={`ingress-${index}`} className="flex items-center my-2">
              <div className="w-1/2">
                <Input
                  type="number"
                  placeholder="Cantidad"
                  value={row.count}
                  onChange={(e) => handleIngressChange(index, "count", e.target.value)}
                  disabled={isDisabled}
                />
              </div>
              <div className="px-2">x</div>
              <div className="w-1/2">
                <Input
                  type="number"
                  placeholder="Monto"
                  value={row.billValue}
                  onChange={(e) => handleIngressChange(index, "billValue", e.target.value)}
                  disabled={isDisabled}
                />
              </div>
              <div className="ml-2 text-sm">
                {row.count && row.billValue && (
                  <>
                    {row.count} x {row.billValue} ={" "}
                    {parseFloat(row.count) * parseFloat(row.billValue)} {ingressAssetName}
                  </>
                )}
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={addIngressRow}
            disabled={!canAddRow(ingressRows) || isDisabled}
            className="mt-2"
          >
            Agregar fila
          </Button>
          <div className="mt-2 text-sm">
            Total Ingreso: {calculateTotal(ingressRows)} / Permitido: {allowedIngressTotal}
          </div>
          {calculateTotal(ingressRows) > allowedIngressTotal && (
            <div className="text-red-500 text-sm">El total de ingresos supera lo permitido.</div>
          )}
        </div>

        {/* Egreso Section */}
        <div className="flex-1 p-4">
          <div className="mb-2 font-semibold">Egreso</div>
          {/* Header for columns */}
          <div className="flex text-sm font-medium">
            <div className="w-1/2">Cantidad</div>
            <div className="w-1/2">Monto</div>
          </div>
          {egressRows.map((row, index) => (
            <div key={`egress-${index}`} className="flex items-center my-2">
              <div className="w-1/2">
                <Input
                  type="number"
                  placeholder="Cantidad"
                  value={row.count}
                  onChange={(e) => handleEgressChange(index, "count", e.target.value)}
                  disabled={isDisabled}
                />
              </div>
              <div className="px-2">x</div>
              <div className="w-1/2">
                <Input
                  type="number"
                  placeholder="Monto"
                  value={row.billValue}
                  onChange={(e) => handleEgressChange(index, "billValue", e.target.value)}
                  disabled={isDisabled}
                />
              </div>
              <div className="ml-2 text-sm">
                {row.count && row.billValue && (
                  <>
                    {row.count} x {row.billValue} ={" "}
                    {parseFloat(row.count) * parseFloat(row.billValue)} {egressAssetName}
                  </>
                )}
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={addEgressRow}
            disabled={!canAddRow(egressRows) || isDisabled}
            className="mt-2"
          >
            Agregar fila
          </Button>
          <div className="mt-2 text-sm">
            Total Egreso: {calculateTotal(egressRows)} / Permitido: {allowedEgressTotal}
          </div>
          {calculateTotal(egressRows) > allowedEgressTotal && (
            <div className="text-red-500 text-sm">El total de egresos supera lo permitido.</div>
          )}
        </div>
      </div>

      {error && <div className="text-red-500">{error}</div>}

      <div className="flex justify-end space-x-4">
        <Button
          type="button"
          variant="outline"
          disabled={
            isSubmitting ||
            !allRowsComplete(ingressRows) ||
            !allRowsComplete(egressRows) ||
            isDisabled
          }
          onClick={() => handleSubmit(false)}
        >
          Cerrar operación
        </Button>
        <Button
          type="button"
          disabled={
            isSubmitting ||
            !allRowsComplete(ingressRows) ||
            !allRowsComplete(egressRows) ||
            isDisabled
          }
          onClick={() => handleSubmit(true)}
        >
          Cerrar operación con logística
        </Button>
      </div>
    </form>
  );
};

export default ValuesForm;

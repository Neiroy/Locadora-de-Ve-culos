import { differenceInCalendarDays, startOfDay } from "date-fns";

export const calculateRentalTotal = (quantidadeDiarias: number, valorDiaria: number) =>
  Number((quantidadeDiarias * valorDiaria).toFixed(2));

export const calculateRentalDays = (dataRetirada?: string, dataPrevistaDevolucao?: string) => {
  if (!dataRetirada || !dataPrevistaDevolucao) return 1;

  const retirada = new Date(dataRetirada);
  const devolucao = new Date(dataPrevistaDevolucao);

  if (Number.isNaN(retirada.getTime()) || Number.isNaN(devolucao.getTime())) return 1;
  const diffDays = differenceInCalendarDays(startOfDay(devolucao), startOfDay(retirada));
  return Math.max(1, diffDays);
};

export const calculateKmDriven = (kmSaida: number, kmEntrada?: number | null) => {
  if (kmEntrada === null || kmEntrada === undefined) return 0;
  return Math.max(0, kmEntrada - kmSaida);
};

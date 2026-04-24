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

type ReturnPricingInput = {
  dataPrevistaDevolucao?: string | null;
  dataDevolucaoReal?: string | null;
  valorDiaria: number;
  valorPrevisto: number;
  toleranciaHoras?: number;
};

export const calculateReturnPricing = ({
  dataPrevistaDevolucao,
  dataDevolucaoReal,
  valorDiaria,
  valorPrevisto,
  toleranciaHoras = 2,
}: ReturnPricingInput) => {
  const prevista = dataPrevistaDevolucao ? new Date(dataPrevistaDevolucao) : null;
  const real = dataDevolucaoReal ? new Date(dataDevolucaoReal) : null;

  if (!prevista || !real || Number.isNaN(prevista.getTime()) || Number.isNaN(real.getTime())) {
    return {
      horasAtraso: 0,
      diasExtras: 0,
      valorAdicional: 0,
      valorFinal: Number(valorPrevisto.toFixed(2)),
      diferencaACobrar: 0,
    };
  }

  const horasAtraso = Math.max(0, (real.getTime() - prevista.getTime()) / (1000 * 60 * 60));
  const diasExtras = horasAtraso <= toleranciaHoras ? 0 : Math.ceil(horasAtraso / 24);
  const valorAdicional = Number((diasExtras * valorDiaria).toFixed(2));
  const valorFinal = Number((valorPrevisto + valorAdicional).toFixed(2));

  return {
    horasAtraso: Number(horasAtraso.toFixed(2)),
    diasExtras,
    valorAdicional,
    valorFinal,
    diferencaACobrar: valorAdicional,
  };
};

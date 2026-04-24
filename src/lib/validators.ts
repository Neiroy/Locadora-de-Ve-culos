export const isValidCPF = (cpf: string) => {
  const cleaned = cpf.replace(/\D/g, "");
  if (cleaned.length !== 11 || /^(\d)\1+$/.test(cleaned)) return false;

  const calc = (length: number) => {
    const sum = cleaned
      .slice(0, length - 1)
      .split("")
      .reduce((acc, digit, idx) => acc + Number(digit) * (length - idx), 0);
    const result = (sum * 10) % 11;
    return result === 10 ? 0 : result;
  };

  return calc(10) === Number(cleaned[9]) && calc(11) === Number(cleaned[10]);
};

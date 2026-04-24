import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { ptBR } from "date-fns/locale";
import clsx from "clsx";

type DateTimePickerProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  min?: string;
};

const toDate = (value?: string) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toLocalDateTimeValue = (date: Date) => {
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return adjusted.toISOString().slice(0, 16);
};

export const DateTimePicker = ({ value, onChange, placeholder, className, min }: DateTimePickerProps) => {
  return (
    <DatePicker
      selected={toDate(value)}
      onChange={(date: Date | null) => onChange(date ? toLocalDateTimeValue(date) : "")}
      showTimeSelect
      dateFormat="dd/MM/yyyy HH:mm"
      locale={ptBR}
      minDate={min ? (toDate(min) || undefined) : undefined}
      placeholderText={placeholder || "Selecione data e hora"}
      timeCaption="Hora"
      className={clsx("h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100", className)}
      popperClassName="luxury-datepicker-popper"
      calendarClassName="luxury-datepicker"
      wrapperClassName="w-full"
    />
  );
};

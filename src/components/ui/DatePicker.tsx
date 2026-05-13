import React, { forwardRef } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { cn } from '../../utils/cn';

interface CustomDatePickerProps {
  selected: Date | null;
  onChange: (date: Date | null) => void;
  className?: string;
  placeholderText?: string;
}

export const CustomDatePicker = ({ selected, onChange, className, placeholderText }: CustomDatePickerProps) => {
  return (
    <DatePicker
      selected={selected}
      onChange={onChange}
      dateFormat="dd/MM/yyyy"
      placeholderText={placeholderText || "dd/mm/yyyy"}
      className={cn(
        "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 outline-none transition-all font-medium",
        className
      )}
      wrapperClassName="w-full"
    />
  );
};

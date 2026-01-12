import React, { useState, useCallback } from 'react';

/**
 * Hook per la gestione di form con validazione e accessibilità
 */
export function useAccessibleForm<T extends Record<string, any>>(
  initialState: T,
  onSubmit: (data: T) => Promise<void>
) {
  const [formData, setFormData] = useState<T>(initialState);
  const [errors, setErrors] = useState<Record<keyof T, string>>({} as any);
  const [touched, setTouched] = useState<Record<keyof T, boolean>>({} as any);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value, type } = e.target;
      const key = name as keyof T;

      const processedValue =
        type === 'number' ? (value === '' ? ('' as any) : Number(value)) : value;

      setFormData((prev) => ({
        ...prev,
        [key]: processedValue
      }));

      // Clear error when user starts typing
      if (errors[key]) {
        setErrors((prev) => ({
          ...prev,
          [key]: ''
        }));
      }
    },
    [errors]
  );

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name } = e.target;
    const key = name as keyof T;

    setTouched((prev) => ({
      ...prev,
      [key]: true
    }));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setIsSubmitting(true);

      try {
        await onSubmit(formData);
      } catch (error) {
        console.error('Form submission error:', error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, onSubmit]
  );

  const reset = useCallback(() => {
    setFormData(initialState);
    setErrors({} as any);
    setTouched({} as any);
  }, [initialState]);

  const setFieldError = useCallback(
    (field: keyof T, error: string) => {
      setErrors((prev) => ({
        ...prev,
        [field]: error
      }));
    },
    []
  );

  return {
    formData,
    setFormData,
    errors,
    setFieldError,
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    isSubmitting
  };
}

interface AccessibleInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  touched?: boolean;
  required?: boolean;
  helperText?: string;
}

/**
 * Componente input accessibile con validazione
 */
export const AccessibleInput = React.forwardRef<HTMLInputElement, AccessibleInputProps>(
  ({ label, error, touched, required, helperText, className, ...props }, ref) => {
    const id = props.id || props.name;
    const hasError = touched && error;

    return (
      <div className="space-y-2">
        <label htmlFor={id} className="block text-sm font-medium text-slate-700">
          {label}
          {required && <span className="text-red-600 ml-1">*</span>}
        </label>
        <input
          ref={ref}
          id={id}
          aria-required={required}
          aria-invalid={hasError ? 'true' : 'false'}
          aria-describedby={hasError ? `${id}-error` : helperText ? `${id}-helper` : undefined}
          className={`w-full rounded-md border px-3 py-2 text-sm transition-colors ${
            hasError
              ? 'border-red-500 bg-red-50 focus:ring-red-500'
              : 'border-slate-300 focus:ring-epicor-600'
          } ${className}`}
          {...props}
        />
        {helperText && !hasError && (
          <p id={`${id}-helper`} className="text-xs text-slate-500">
            {helperText}
          </p>
        )}
        {hasError && (
          <p id={`${id}-error`} className="text-xs text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

AccessibleInput.displayName = 'AccessibleInput';

interface AccessibleSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: { value: string | number; label: string }[];
  error?: string;
  touched?: boolean;
  required?: boolean;
  placeholder?: string;
}

/**
 * Componente select accessibile
 */
export const AccessibleSelect = React.forwardRef<HTMLSelectElement, AccessibleSelectProps>(
  ({ label, options, error, touched, required, placeholder, className, ...props }, ref) => {
    const id = props.id || props.name;
    const hasError = touched && error;

    return (
      <div className="space-y-2">
        <label htmlFor={id} className="block text-sm font-medium text-slate-700">
          {label}
          {required && <span className="text-red-600 ml-1">*</span>}
        </label>
        <select
          ref={ref}
          id={id}
          aria-required={required}
          aria-invalid={hasError ? 'true' : 'false'}
          aria-describedby={hasError ? `${id}-error` : undefined}
          className={`w-full rounded-md border px-3 py-2 text-sm transition-colors ${
            hasError
              ? 'border-red-500 bg-red-50 focus:ring-red-500'
              : 'border-slate-300 focus:ring-epicor-600'
          } ${className}`}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {hasError && (
          <p id={`${id}-error`} className="text-xs text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

AccessibleSelect.displayName = 'AccessibleSelect';

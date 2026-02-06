/**
 * Form Field Hooks
 * Consolidates duplicate form state patterns across 4+ files
 *
 * Common patterns consolidated:
 * - Input change handling with debounce
 * - Error state management
 * - Suggestions/dropdown state
 * - Form reset functionality
 * - Validation
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'

// ============ Types ============

export interface FieldState<T> {
  /** Current value */
  value: T
  /** Error message */
  error: string | null
  /** Whether field has been touched */
  touched: boolean
  /** Whether field is dirty (changed from initial) */
  dirty: boolean
  /** Whether field is valid */
  isValid: boolean
}

export interface UseFieldOptions<T> {
  /** Initial value */
  initialValue: T
  /** Validation function */
  validate?: (value: T) => string | null
  /** Debounce delay for validation (ms) */
  debounceMs?: number
  /** Transform input before setting */
  transform?: (value: T) => T
  /** Validate on change (default: true) */
  validateOnChange?: boolean
  /** Validate on blur (default: true) */
  validateOnBlur?: boolean
}

export interface UseFieldReturn<T> extends FieldState<T> {
  /** Set value */
  setValue: (value: T) => void
  /** Set error manually */
  setError: (error: string | null) => void
  /** Mark as touched */
  setTouched: (touched: boolean) => void
  /** Reset to initial value */
  reset: () => void
  /** Validate manually */
  validateField: () => boolean
  /** Event handlers for input */
  inputProps: {
    value: T
    onChange: (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => void
    onBlur: () => void
  }
}

// ============ Single Field Hook ============

/**
 * Hook for managing a single form field
 *
 * @example
 * const email = useField({
 *   initialValue: '',
 *   validate: (v) => !v.includes('@') ? 'Invalid email' : null,
 * })
 *
 * <input {...email.inputProps} />
 * {email.error && <span>{email.error}</span>}
 */
export function useField<T extends string | number | boolean>(
  options: UseFieldOptions<T>
): UseFieldReturn<T> {
  const {
    initialValue,
    validate,
    debounceMs = 0,
    transform,
    validateOnChange = true,
    validateOnBlur = true,
  } = options

  const [value, setValueState] = useState<T>(initialValue)
  const [error, setError] = useState<string | null>(null)
  const [touched, setTouched] = useState(false)
  const [dirty, setDirty] = useState(false)
  const initialValueRef = useRef(initialValue)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Derived state
  const isValid = error === null

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  // Validate field
  const validateField = useCallback((): boolean => {
    if (!validate) return true
    const validationError = validate(value)
    setError(validationError)
    return validationError === null
  }, [value, validate])

  // Set value with optional validation
  const setValue = useCallback(
    (newValue: T) => {
      const transformed = transform ? transform(newValue) : newValue
      setValueState(transformed)
      setDirty(transformed !== initialValueRef.current)

      if (validateOnChange && validate) {
        if (debounceMs > 0) {
          if (debounceRef.current) {
            clearTimeout(debounceRef.current)
          }
          debounceRef.current = setTimeout(() => {
            setError(validate(transformed))
          }, debounceMs)
        } else {
          setError(validate(transformed))
        }
      }
    },
    [validate, validateOnChange, debounceMs, transform]
  )

  // Reset field
  const reset = useCallback(() => {
    setValueState(initialValueRef.current)
    setError(null)
    setTouched(false)
    setDirty(false)
  }, [])

  // Input props
  const inputProps = useMemo(
    () => ({
      value,
      onChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
      ) => {
        setValue(e.target.value as T)
      },
      onBlur: () => {
        setTouched(true)
        if (validateOnBlur) {
          validateField()
        }
      },
    }),
    [value, setValue, validateOnBlur, validateField]
  )

  return {
    value,
    error,
    touched,
    dirty,
    isValid,
    setValue,
    setError,
    setTouched,
    reset,
    validateField,
    inputProps,
  }
}

// ============ Debounced Search Field Hook ============

export interface UseSearchFieldOptions<T> {
  /** Initial value */
  initialValue?: string
  /** Debounce delay (ms) */
  debounceMs?: number
  /** Search function */
  onSearch: (query: string) => Promise<T[]>
  /** Minimum characters to trigger search */
  minChars?: number
}

export interface UseSearchFieldReturn<T> {
  /** Current input value */
  query: string
  /** Set query */
  setQuery: (query: string) => void
  /** Search results */
  results: T[]
  /** Loading state */
  loading: boolean
  /** Error message */
  error: string | null
  /** Whether dropdown is open */
  isOpen: boolean
  /** Open dropdown */
  open: () => void
  /** Close dropdown */
  close: () => void
  /** Select a result */
  select: (result: T) => void
  /** Selected result */
  selected: T | null
  /** Clear selection */
  clear: () => void
  /** Input props */
  inputProps: {
    value: string
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    onFocus: () => void
    onBlur: () => void
  }
}

/**
 * Hook for search input with debounced API calls
 *
 * @example
 * const citySearch = useSearchField({
 *   debounceMs: 300,
 *   minChars: 2,
 *   onSearch: async (query) => {
 *     const res = await fetch(`/api/cities?q=${query}`)
 *     return res.json()
 *   },
 * })
 */
export function useSearchField<T>(options: UseSearchFieldOptions<T>): UseSearchFieldReturn<T> {
  const { initialValue = '', debounceMs = 300, onSearch, minChars = 1 } = options

  const [query, setQueryState] = useState(initialValue)
  const [results, setResults] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [selected, setSelected] = useState<T | null>(null)

  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (abortRef.current) abortRef.current.abort()
    }
  }, [])

  // Set query with debounced search
  const setQuery = useCallback(
    (newQuery: string) => {
      setQueryState(newQuery)
      setSelected(null)

      // Clear previous debounce
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }

      // Abort previous request
      if (abortRef.current) {
        abortRef.current.abort()
      }

      // Don't search if below minChars
      if (newQuery.length < minChars) {
        setResults([])
        setIsOpen(false)
        return
      }

      // Debounced search
      debounceRef.current = setTimeout(async () => {
        setLoading(true)
        setError(null)
        abortRef.current = new AbortController()

        try {
          const searchResults = await onSearch(newQuery)
          setResults(searchResults)
          setIsOpen(searchResults.length > 0)
        } catch (err) {
          if ((err as Error).name !== 'AbortError') {
            setError(err instanceof Error ? err.message : 'Search failed')
            setResults([])
          }
        } finally {
          setLoading(false)
        }
      }, debounceMs)
    },
    [onSearch, debounceMs, minChars]
  )

  // Select a result
  const select = useCallback((result: T) => {
    setSelected(result)
    setIsOpen(false)
    setResults([])
  }, [])

  // Clear selection
  const clear = useCallback(() => {
    setQueryState('')
    setSelected(null)
    setResults([])
    setIsOpen(false)
    setError(null)
  }, [])

  // Input props
  const inputProps = useMemo(
    () => ({
      value: query,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value),
      onFocus: () => {
        if (results.length > 0) setIsOpen(true)
      },
      onBlur: () => {
        // Delay close to allow click on results
        setTimeout(() => setIsOpen(false), 200)
      },
    }),
    [query, setQuery, results.length]
  )

  return {
    query,
    setQuery,
    results,
    loading,
    error,
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    select,
    selected,
    clear,
    inputProps,
  }
}

// ============ Form Hook ============

export interface UseFormOptions<T extends Record<string, unknown>> {
  /** Initial values */
  initialValues: T
  /** Validation schema */
  validate?: (values: T) => Partial<Record<keyof T, string>>
  /** Submit handler */
  onSubmit: (values: T) => void | Promise<void>
  /** Validate on change (default: false) */
  validateOnChange?: boolean
}

export interface UseFormReturn<T extends Record<string, unknown>> {
  /** Current values */
  values: T
  /** Errors by field */
  errors: Partial<Record<keyof T, string>>
  /** Touched fields */
  touched: Partial<Record<keyof T, boolean>>
  /** Whether form is submitting */
  isSubmitting: boolean
  /** Whether form is valid */
  isValid: boolean
  /** Whether form is dirty */
  isDirty: boolean
  /** Set a field value */
  setFieldValue: <K extends keyof T>(field: K, value: T[K]) => void
  /** Set field touched */
  setFieldTouched: <K extends keyof T>(field: K, touched?: boolean) => void
  /** Set field error */
  setFieldError: <K extends keyof T>(field: K, error: string | null) => void
  /** Get field props */
  getFieldProps: <K extends keyof T>(
    field: K
  ) => {
    name: K
    value: T[K]
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    onBlur: () => void
  }
  /** Handle submit */
  handleSubmit: (e?: React.FormEvent) => Promise<void>
  /** Reset form */
  reset: () => void
  /** Validate all fields */
  validateForm: () => boolean
}

/**
 * Hook for managing entire form state
 *
 * @example
 * const form = useForm({
 *   initialValues: { email: '', password: '' },
 *   validate: (values) => ({
 *     email: !values.email ? 'Required' : undefined,
 *     password: values.password.length < 6 ? 'Min 6 chars' : undefined,
 *   }),
 *   onSubmit: async (values) => {
 *     await login(values)
 *   },
 * })
 */
export function useForm<T extends Record<string, unknown>>(
  options: UseFormOptions<T>
): UseFormReturn<T> {
  const { initialValues, validate, onSubmit, validateOnChange = false } = options

  const [values, setValues] = useState<T>(initialValues)
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({})
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const initialValuesRef = useRef(initialValues)

  // Derived state
  const isValid = Object.keys(errors).length === 0
  const isDirty = JSON.stringify(values) !== JSON.stringify(initialValuesRef.current)

  // Validate form
  const validateForm = useCallback((): boolean => {
    if (!validate) return true
    const validationErrors = validate(values)
    const filteredErrors = Object.fromEntries(
      Object.entries(validationErrors).filter(([, v]) => v !== undefined)
    ) as Partial<Record<keyof T, string>>
    setErrors(filteredErrors)
    return Object.keys(filteredErrors).length === 0
  }, [values, validate])

  // Set field value
  const setFieldValue = useCallback(
    <K extends keyof T>(field: K, value: T[K]) => {
      setValues((prev) => ({ ...prev, [field]: value }))
      if (validateOnChange && validate) {
        const validationErrors = validate({ ...values, [field]: value })
        setErrors((prev) => ({
          ...prev,
          [field]: validationErrors[field],
        }))
      }
    },
    [values, validate, validateOnChange]
  )

  // Set field touched
  const setFieldTouched = useCallback(<K extends keyof T>(field: K, isTouched = true) => {
    setTouched((prev) => ({ ...prev, [field]: isTouched }))
  }, [])

  // Set field error
  const setFieldError = useCallback(<K extends keyof T>(field: K, error: string | null) => {
    setErrors((prev) => {
      if (error === null) {
        const { [field]: _, ...rest } = prev
        return rest as Partial<Record<keyof T, string>>
      }
      return { ...prev, [field]: error }
    })
  }, [])

  // Get field props
  const getFieldProps = useCallback(
    <K extends keyof T>(field: K) => ({
      name: field,
      value: values[field],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        setFieldValue(field, e.target.value as T[K])
      },
      onBlur: () => {
        setFieldTouched(field, true)
        if (validate) {
          const validationErrors = validate(values)
          setErrors((prev) => ({
            ...prev,
            [field]: validationErrors[field],
          }))
        }
      },
    }),
    [values, setFieldValue, setFieldTouched, validate]
  )

  // Handle submit
  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault()

      // Touch all fields
      const allTouched = Object.keys(initialValuesRef.current).reduce(
        (acc, key) => ({ ...acc, [key]: true }),
        {} as Partial<Record<keyof T, boolean>>
      )
      setTouched(allTouched)

      // Validate
      if (!validateForm()) return

      setIsSubmitting(true)
      try {
        await onSubmit(values)
      } finally {
        setIsSubmitting(false)
      }
    },
    [values, validateForm, onSubmit]
  )

  // Reset form
  const reset = useCallback(() => {
    setValues(initialValuesRef.current)
    setErrors({})
    setTouched({})
    setIsSubmitting(false)
  }, [])

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    isDirty,
    setFieldValue,
    setFieldTouched,
    setFieldError,
    getFieldProps,
    handleSubmit,
    reset,
    validateForm,
  }
}

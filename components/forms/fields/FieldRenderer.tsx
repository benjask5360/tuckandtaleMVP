'use client'

import { useState } from 'react'
import SelectableButton from './SelectableButton'

export interface FormFieldConfig {
  id: string
  type: 'text' | 'select' | 'multiselect' | 'date' | 'toggle' | 'buttons' | 'textarea' | 'number'
  label: string
  placeholder?: string
  options?: { value: string; label: string; emoji?: string }[]
  required?: boolean
  defaultValue?: any
  validation?: any
  customOptions?: boolean // Allow custom input alongside predefined options
}

interface FieldRendererProps {
  field: FormFieldConfig
  value: any
  onChange: (value: any) => void
  error?: string
}

export default function FieldRenderer({
  field,
  value,
  onChange,
  error
}: FieldRendererProps) {
  const [showCustomInput, setShowCustomInput] = useState(false)

  switch (field.type) {
    case 'text':
      return (
        <div>
          <label htmlFor={field.id} className="block text-sm font-semibold text-neutral-700 mb-2">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <input
            id={field.id}
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            className="w-full px-4 py-3 bg-blue-50 border-0 rounded-xl focus:ring-2 focus:ring-primary-400 focus:bg-white transition-all text-neutral-900 placeholder-neutral-500"
          />
          {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        </div>
      )

    case 'number':
      return (
        <div>
          <label htmlFor={field.id} className="block text-sm font-semibold text-neutral-700 mb-2">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <input
            id={field.id}
            type="number"
            value={value || ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
            placeholder={field.placeholder}
            required={field.required}
            className="w-full px-4 py-3 bg-blue-50 border-0 rounded-xl focus:ring-2 focus:ring-primary-400 focus:bg-white transition-all text-neutral-900 placeholder-neutral-500"
          />
          {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        </div>
      )

    case 'date':
      return (
        <div>
          <label htmlFor={field.id} className="block text-sm font-semibold text-neutral-700 mb-2">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <input
            id={field.id}
            type="date"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
            className="w-full px-4 py-3 bg-blue-50 border-0 rounded-xl focus:ring-2 focus:ring-primary-400 focus:bg-white transition-all text-neutral-900"
          />
          {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        </div>
      )

    case 'textarea':
      return (
        <div>
          <label htmlFor={field.id} className="block text-sm font-semibold text-neutral-700 mb-2">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <textarea
            id={field.id}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            rows={3}
            className="w-full px-4 py-3 bg-blue-50 border-0 rounded-xl focus:ring-2 focus:ring-primary-400 focus:bg-white transition-all text-neutral-900 placeholder-neutral-500"
          />
          {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        </div>
      )

    case 'toggle':
      return (
        <div className="flex items-center justify-between">
          <label htmlFor={field.id} className="text-sm font-semibold text-neutral-700">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <button
            type="button"
            onClick={() => onChange(!value)}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full transition-colors
              ${value ? 'bg-blue-600' : 'bg-gray-300'}
            `}
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                ${value ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
          {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        </div>
      )

    case 'select':
    case 'buttons':
      return (
        <div>
          <SelectableButton
            label={field.label}
            options={field.options || []}
            value={value}
            onChange={onChange}
            multiple={false}
            required={field.required}
          />
          {field.customOptions && (
            <div className="mt-3">
              {!showCustomInput ? (
                <button
                  type="button"
                  onClick={() => setShowCustomInput(true)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  + Add custom option
                </button>
              ) : (
                <input
                  type="text"
                  placeholder="Enter custom value"
                  value={value && !field.options?.find(o => o.value === value) ? value : ''}
                  onChange={(e) => onChange(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-neutral-200 rounded-lg focus:ring-2 focus:ring-primary-400 text-neutral-900 placeholder-neutral-500"
                />
              )}
            </div>
          )}
          {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        </div>
      )

    case 'multiselect':
      return (
        <div>
          <SelectableButton
            label={field.label}
            options={field.options || []}
            value={value || []}
            onChange={onChange}
            multiple={true}
            required={field.required}
          />
          {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        </div>
      )

    default:
      return null
  }
}
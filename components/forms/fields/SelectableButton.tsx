'use client'

interface Option {
  value: string
  label: string
  emoji?: string
}

interface SelectableButtonProps {
  options: Option[]
  value?: string | string[]
  onChange: (value: string | string[]) => void
  multiple?: boolean
  className?: string
  label?: string
  required?: boolean
}

export default function SelectableButton({
  options,
  value,
  onChange,
  multiple = false,
  className = '',
  label,
  required = false
}: SelectableButtonProps) {
  const handleClick = (optionValue: string) => {
    if (multiple) {
      const currentValues = (value as string[]) || []
      if (currentValues.includes(optionValue)) {
        onChange(currentValues.filter(v => v !== optionValue))
      } else {
        onChange([...currentValues, optionValue])
      }
    } else {
      onChange(optionValue)
    }
  }

  const isSelected = (optionValue: string) => {
    if (multiple) {
      return ((value as string[]) || []).includes(optionValue)
    }
    return value === optionValue
  }

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-semibold text-neutral-700 mb-3">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="flex flex-wrap gap-2">
        {options.map(option => (
          <button
            key={option.value}
            type="button"
            onClick={() => handleClick(option.value)}
            className={`
              px-4 py-2.5 rounded-xl font-medium transition-all duration-200
              ${isSelected(option.value)
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg scale-105'
                : 'bg-white border-2 border-neutral-200 text-neutral-700 hover:border-blue-300 hover:shadow-md'
              }
            `}
          >
            {option.emoji && <span className="mr-1.5">{option.emoji}</span>}
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
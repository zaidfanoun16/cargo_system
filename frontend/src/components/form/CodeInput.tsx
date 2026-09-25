import { type ClipboardEvent, type KeyboardEvent, useRef } from 'react'
import { useTranslation } from 'react-i18next'

const LENGTH = 6

type Props = {
  value: string
  onChange: (code: string) => void
  invalid?: boolean
  autoFocus?: boolean
}

// Six boxes for the emailed code. Typing moves to the next box, and
// pasting the whole code fills all of them. Digits always read left to
// right, also in Arabic.
export function CodeInput({ value, onChange, invalid, autoFocus }: Props) {
  const { t } = useTranslation()
  const inputs = useRef<(HTMLInputElement | null)[]>([])
  const digits = Array.from({ length: LENGTH }, (_, index) => value[index] ?? '')

  function focus(index: number) {
    inputs.current[Math.max(0, Math.min(LENGTH - 1, index))]?.focus()
  }

  function setDigit(index: number, digit: string) {
    const next = [...digits]
    next[index] = digit
    onChange(next.join('').slice(0, LENGTH))
  }

  function handleInput(index: number, raw: string) {
    const typed = raw.replace(/\D/g, '')
    if (!typed) return

    // Several digits at once (autofill or a fast typist): fill forward
    if (typed.length > 1) {
      const next = (digits.slice(0, index).join('') + typed).slice(0, LENGTH)
      onChange(next)
      focus(next.length)
      return
    }

    setDigit(index, typed)
    focus(index + 1)
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace') {
      event.preventDefault()
      if (digits[index]) {
        setDigit(index, '')
      } else if (index > 0) {
        setDigit(index - 1, '')
        focus(index - 1)
      }
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      focus(index - 1)
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      focus(index + 1)
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, LENGTH)
    if (!pasted) return
    event.preventDefault()
    onChange(pasted)
    focus(pasted.length)
  }

  return (
    <div dir="ltr" className="flex justify-center gap-2 sm:gap-3" role="group" aria-label={t('auth.codeLabel')}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => {
            inputs.current[index] = element
          }}
          value={digit}
          onChange={(event) => handleInput(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          onFocus={(event) => event.target.select()}
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          autoFocus={autoFocus && index === 0}
          aria-label={t('auth.codeDigit', { number: index + 1 })}
          aria-invalid={invalid || undefined}
          className="size-12 rounded-xl border border-border bg-surface text-center text-xl font-bold text-text transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 aria-[invalid=true]:border-red-500 sm:size-14 sm:text-2xl"
        />
      ))}
    </div>
  )
}

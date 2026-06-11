import { ChevronDown, Loader2 } from 'lucide-react'

import { Button, ButtonProps } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command'
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Currency } from '@/lib/currency'
import { useMediaQuery } from '@/lib/hooks'
type Props = {
  currencies: Currency[]  
  onValueChange: (currencyCode: Currency['code']) => void
  /** Currency code to be selected by default. Overwriting this value will update current selection, too. */
  defaultValue: Currency['code']
  isLoading: boolean
  className?: string
  /** Show only the flag, hide currency name and code */
  flagOnly?: boolean
}

export function CurrencySelector({
  currencies,
  onValueChange,
  defaultValue,
  isLoading,
  className,
  flagOnly,
}: Props) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState<string>(defaultValue)
  const isDesktop = useMediaQuery('(min-width: 768px)')

  // allow overwriting currently selected currency from outside
  useEffect(() => {
    setValue(defaultValue)
    onValueChange(defaultValue)
  }, [defaultValue])

  const selectedCurrency =
    currencies.find((currency) => (currency.code ?? '') === value) ??
    currencies.find((currency) => currency.code === 'EUR') ??
    currencies[0]

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <CurrencyButton
            className={className}
            currency={selectedCurrency}
            open={open}
            isLoading={isLoading}
            flagOnly={flagOnly}
          />
        </PopoverTrigger>
        <PopoverContent className="p-0" align="start">
          <CurrencyCommand
            currencies={currencies}
            onValueChange={(code) => {
              setValue(code)
              onValueChange(code)
              setOpen(false)
            }}
          />
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <CurrencyButton
          className={className}
          currency={selectedCurrency}
          open={open}
          isLoading={isLoading}
          flagOnly={flagOnly}
        />
      </DrawerTrigger>
      <DrawerContent className="p-0">
        <CurrencyCommand
          currencies={currencies}
          onValueChange={(id) => {
            setValue(id)
            onValueChange(id)
            setOpen(false)
          }}
        />
      </DrawerContent>
    </Drawer>
  )
}

function CurrencyCommand({
  currencies,
  onValueChange,
}: {
  currencies: Currency[]
  onValueChange: (currencyId: Currency['code']) => void
}) {
  const currencyGroup = (currency: Currency) => {
    switch (currency.code) {
      case 'USD':
      case 'EUR':
      case 'JPY':
      case 'GBP':
        return 'common'
      default:
        if (currency.code === '') return 'custom'
        return 'other'
    }
  }
  const t = useTranslations('Currencies')
  const currenciesByGroup = currencies.reduce<Record<string, Currency[]>>(
    (acc, currency) => ({
      ...acc,
      [currencyGroup(currency)]: (acc[currencyGroup(currency)] ?? []).concat([
        currency,
      ]),
    }),
    {},
  )

  return (
    <Command>
      <CommandInput placeholder={t('search')} className="text-base" />
      <CommandEmpty>{t('noCurrency')}</CommandEmpty>
      <div className="w-full max-h-[300px] overflow-y-auto">
        {Object.entries(currenciesByGroup).map(
          ([group, groupCurrencies], index) => (
            <CommandGroup key={index} heading={t(`${group}.heading`)}>
              {groupCurrencies.map((currency) => (
                <CommandItem
                  key={currency.code}
                  value={`${currency.code} ${currency.name} ${currency.symbol}`}
                  onSelect={(currentValue) => {
                    onValueChange(currency.code)
                  }}
                >
                  <CurrencyLabel currency={currency} />
                </CommandItem>
              ))}
            </CommandGroup>
          ),
        )}
      </div>
    </Command>
  )
}

type CurrencyButtonProps = {
  currency: Currency
  open: boolean
  isLoading: boolean
  flagOnly?: boolean
}
const CurrencyButton = forwardRef<HTMLButtonElement, CurrencyButtonProps>(
  (
    { currency, open, isLoading, flagOnly, ...props }: ButtonProps & CurrencyButtonProps,
    ref,
  ) => {
    const iconClassName = 'ml-2 h-4 w-4 shrink-0 opacity-50'
    return (
      <Button
        variant="outline"
        role="combobox"
        aria-expanded={open}
        className={flagOnly ? 'h-12 w-12 p-0' : 'flex w-full justify-between'}
        ref={ref}
        {...props}
      >
        <CurrencyLabel currency={currency} flagOnly={flagOnly} />
        {!flagOnly &&
          (isLoading ? (
            <Loader2 className={`animate-spin ${iconClassName}`} />
          ) : (
            <ChevronDown className={iconClassName} />
          ))}
      </Button>
    )
  },
)
CurrencyButton.displayName = 'CurrencyButton'

function CurrencyLabel({ currency, flagOnly }: { currency: Currency; flagOnly?: boolean }) {
  const flagUrl = `https://flagcdn.com/h24/${
    currency?.code.length ? currency.code.slice(0, 2).toLowerCase() : 'un'
  }.png`
  if (flagOnly) {
    return <img src={flagUrl} className="w-6 h-6" alt="" />
  }
  return (
    <div className="flex items-center gap-3">
      <img src={flagUrl} className="w-4" alt="" />
      {currency.name}
      {currency.code ? ` (${currency.code})` : ''}
    </div>
  )
}

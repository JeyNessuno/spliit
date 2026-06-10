import { Balances } from '@/lib/balances'
import { Currency } from '@/lib/currency'
import { cn, formatCurrency } from '@/lib/utils'
import { Participant } from '@prisma/client'
import { useLocale } from 'next-intl'

type Props = {
  balances: Balances
  participants: Participant[]
  currency: Currency
  activeUserId?: string
}

export function BalancesList({ balances, participants, currency, activeUserId }: Props) {
  const locale = useLocale()
  const maxBalance = Math.max(
    ...Object.values(balances).map((b) => Math.abs(b.total)),
  )

  return (
    <div className="text-sm">
      {participants.map((participant) => {
        const balance = balances[participant.id]?.total ?? 0
        const isLeft = balance >= 0
        return (
          <div
            key={participant.id}
            className={cn(
              'flex border-t border-border/60 first:border-t-0',
              isLeft || 'flex-row-reverse',
            )}
          >
            <div className={cn('w-1/2 py-3 pr-3', isLeft && 'text-right')}>
              {participant.name}
              {activeUserId === participant.id && ' (you)'}
            </div>
            <div className={cn('w-1/2 relative', isLeft || 'text-right')}>
              <div className="absolute inset-0 z-20 py-3">
                {formatCurrency(currency, balance, locale)}
              </div>
              {balance !== 0 && (
                <div
                  className={cn(
                    'absolute top-2 h-8 z-10',
                    isLeft
                      ? 'left-0 rounded-r-full bg-primary/25'
                      : 'right-0 rounded-l-full bg-muted',
                  )}
                  style={{
                    width: (Math.abs(balance) / maxBalance) * 100 + '%',
                  }}
                ></div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

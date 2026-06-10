import { Button } from '@/components/ui/button'
import { Reimbursement } from '@/lib/balances'
import { Currency } from '@/lib/currency'
import { formatCurrency } from '@/lib/utils'
import { Participant } from '@prisma/client'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'

type Props = {
  reimbursements: Reimbursement[]
  participants: Participant[]
  currency: Currency
  groupId: string
  activeUserId?: string
}

export function ReimbursementList({
  reimbursements,
  participants,
  currency,
  groupId,
  activeUserId,
}: Props) {
  const locale = useLocale()
  const t = useTranslations('Balances.Reimbursements')
  if (reimbursements.length === 0) {
    return <p className="text-sm pb-6">{t('noImbursements')}</p>
  }

  const getParticipant = (id: string) => participants.find((p) => p.id === id)
  const getParticipantName = (id: string) => {
    const participant = getParticipant(id)
    if (!participant) return ''
    const suffix = activeUserId === id ? ' (you)' : ''
    return participant.name + suffix
  }
  return (
    <div className="text-sm">
      {reimbursements.map((reimbursement, index) => (
        <div
          className="flex justify-between border-t border-border/60 py-4 first:border-t-0"
          key={index}
        >
          <div className="flex flex-col gap-1 items-start sm:flex-row sm:items-baseline sm:gap-4">
            <div>
              {t.rich('owes', {
                from: getParticipantName(reimbursement.from),
                to: getParticipantName(reimbursement.to),
                strong: (chunks) => <strong>{chunks}</strong>,
              })}
            </div>
            <Button variant="link" asChild className="-mx-4 -my-3 h-auto">
              <Link
                href={`/groups/${groupId}/expenses/create?reimbursement=yes&from=${reimbursement.from}&to=${reimbursement.to}&amount=${reimbursement.amount}`}
              >
                {t('markAsPaid')}
              </Link>
            </Button>
          </div>
          <div>{formatCurrency(currency, reimbursement.amount, locale)}</div>
        </div>
      ))}
    </div>
  )
}

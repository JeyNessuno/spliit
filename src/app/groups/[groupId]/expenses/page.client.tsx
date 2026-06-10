'use client'

import BalancesAndReimbursements from '@/app/groups/[groupId]/balances/balances-and-reimbursements'
import { ActiveUserModal } from '@/app/groups/[groupId]/expenses/active-user-modal'
import { CreateFromReceiptButton } from '@/app/groups/[groupId]/expenses/create-from-receipt-button'
import { ExpenseList } from '@/app/groups/[groupId]/expenses/expense-list'
import ExportButton from '@/app/groups/[groupId]/export-button'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Plus } from 'lucide-react'
import { Metadata } from 'next'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useCurrentGroup } from '../current-group-context'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Expenses',
}

export default function GroupExpensesPageClient({
  enableReceiptExtract,
}: {
  enableReceiptExtract: boolean
}) {
  const t = useTranslations('Expenses')
  const { groupId } = useCurrentGroup()

  return (
    <>
      <Card>
        <div className="flex flex-1 items-start">
          <CardHeader className="flex-1">
            <CardTitle>{t('title')}</CardTitle>
            <CardDescription>{t('description')}</CardDescription>
          </CardHeader>
          <CardHeader className="flex flex-row gap-2 space-y-0">
            <ExportButton groupId={groupId} />
            {enableReceiptExtract && <CreateFromReceiptButton />}
            <Button asChild size="icon" className="hidden sm:inline-flex">
              <Link
                href={`/groups/${groupId}/expenses/create`}
                title={t('create')}
                onClick={() => {
                  try {
                    sessionStorage.setItem('spliit.focusAmount', '1')
                  } catch (e) {}
                }}
              >
                <Plus className="w-4 h-4" />
              </Link>
            </Button>
          </CardHeader>
        </div>

        <CardContent className="p-0 pt-2 pb-4 sm:pb-6 flex flex-col gap-4 relative">
          <ExpenseList />
        </CardContent>
      </Card>

      <BalancesAndReimbursements />

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border/70 bg-background/95 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur-xl sm:hidden">
        <Button asChild className="w-full">
          <Link
            href={`/groups/${groupId}/expenses/create`}
            onClick={() => {
              try {
                sessionStorage.setItem('spliit.focusAmount', '1')
              } catch (e) {}
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('create')}
          </Link>
        </Button>
      </div>

      <ActiveUserModal groupId={groupId} />
    </>
  )
}

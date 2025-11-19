import { getTranslations } from 'next-intl/server';
import { UnsubscribeButton } from './unsubscribe-button';
import { verifyUnsubscribeToken } from '@/app/actions/unsubscribe';

interface UnsubscribePageProps {
    searchParams: Promise<{ uid?: string; token?: string }>
}

export default async function UnsubscribePage({ searchParams }: UnsubscribePageProps) {
    const t = await getTranslations('Unsubscribe');
    const { uid, token } = await searchParams;

    if (!uid || !token) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
                <h1 className="text-2xl font-bold mb-2">Invalid Link</h1>
                <p className="text-muted-foreground">This unsubscribe link is invalid or incomplete.</p>
            </div>
        )
    }

    const isValid = await verifyUnsubscribeToken(uid, token)

    if (!isValid) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
                <h1 className="text-2xl font-bold mb-2">Link Expired or Invalid</h1>
                <p className="text-muted-foreground">We could not verify your request.</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center max-w-md mx-auto">
            <h1 className="text-2xl font-bold mb-4">Unsubscribe from Emails</h1>
            <p className="text-muted-foreground mb-8">
                Are you sure you want to unsubscribe from all email notifications from Proph.bet?
                You will still receive important security updates.
            </p>
            
            <UnsubscribeButton uid={uid} token={token} />
        </div>
    )
}


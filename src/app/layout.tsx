import './globals.css';
import type { Metadata } from 'next';
import { ConsentBanner } from '@/components/ConsentBanner';
import { ThirdPartyScripts } from '@/components/ThirdPartyScripts';
import { DebugWidget } from '@/components/DebugWidget';
import { Suspense } from 'react';

export const metadata: Metadata = {
    title: 'Dynamic RSOC Platform',
    description: 'SERP and Article pages with RSOC ads and tracking',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    const enableThirdParty = process.env.NEXT_PUBLIC_ENABLE_THIRD_PARTY === 'true';
    const enableDebug = process.env.NEXT_PUBLIC_DEBUG_WIDGET === 'true';
    const caPub = process.env.NEXT_PUBLIC_ADSENSE_CA_PUB;
    return (
        <html lang="en">
            <head>
                {caPub ? (
                    <script
                        async
                        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${caPub}`}
                        crossOrigin="anonymous"
                    />
                ) : null}
            </head>
            <body className="min-h-screen text-white">
                {enableThirdParty ? <ThirdPartyScripts /> : null}
                <ConsentBanner />
                <main className="max-w-4xl mx-auto p-4">{children}</main>
                {enableDebug ? (
                    <Suspense fallback={null}>
                        <DebugWidget />
                    </Suspense>
                ) : null}
            </body>
        </html>
    );
}

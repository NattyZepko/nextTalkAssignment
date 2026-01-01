'use client';
import Script from 'next/script';

export function ThirdPartyScripts() {
    const fbPixelId = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID;
    const inmobiChoiceId = process.env.NEXT_PUBLIC_INMOBI_CHOICE_ID;
    const cmpDomain = process.env.NEXT_PUBLIC_CMP_HOST_OVERRIDE;
    const adsenseAdTest = process.env.NEXT_PUBLIC_ADSENSE_ADTEST === 'true';
    const cmpDebug = (process.env.NEXT_PUBLIC_CMP_DEBUG === 'true') || (process.env.NEXT_PUBLIC_DEBUG_WIDGET === 'true');
    const fakeCmp = (process.env.NEXT_PUBLIC_FAKE_CMP === 'true') || (process.env.NEXT_PUBLIC_ADSENSE_ADTEST === 'true');

    return (
        <>
            {fbPixelId ? (
                <>
                    <Script id="fb-pixel" strategy="afterInteractive">
                        {`
            !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
            n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${fbPixelId}');
            fbq('track', 'PageView');
          `}
                    </Script>
                    <noscript>
                        <img height="1" width="1" style={{ display: 'none' }}
                            src={`https://www.facebook.com/tr?id=${fbPixelId}&ev=PageView&noscript=1`} alt="" />
                    </noscript>
                </>
            ) : null}

            {/* InMobi Choice CMP: load as early as possible to satisfy CSA */}
            {inmobiChoiceId && cmpDomain ? (
                <Script
                    id="inmobi-choice"
                    src={`https://cmp.inmobi.com/choice/${inmobiChoiceId}/${cmpDomain}/choice.js?tag_version=V3`}
                    strategy="beforeInteractive"
                />
            ) : null}

            {/* Note: page-level auto ads are disabled to avoid duplicate pushes */}
        </>
    );
}

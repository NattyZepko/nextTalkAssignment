'use client';
import React from 'react';
import { trackClickAndLead } from '@/lib/clientTracking';

type TrackedLinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    q?: string;
    locale?: string;
    channel?: string;
    rac?: string;
    keyword?: string;
    ad_creative?: string;
};

export function TrackedLink({
    q,
    locale,
    channel,
    rac,
    keyword,
    ad_creative,
    onClick,
    href,
    children,
    ...rest
}: TrackedLinkProps) {
    return (
        <a
            href={href}
            onClick={async (e) => {
                // Let cmd/ctrl-click open in new tab without blocking
                const isNewTab = e.ctrlKey || e.metaKey || e.button === 1 || rest.target === '_blank';
                // Fire tracking without blocking navigation
                const tracking = trackClickAndLead({ q, locale, channel, rac, keyword, ad_creative });
                // Call any user handler
                onClick?.(e);
                if (!isNewTab && href) {
                    e.preventDefault();
                    // Give a tiny window for beacon to enqueue, then navigate
                    try {
                        await Promise.race([
                            tracking,
                            new Promise((resolve) => setTimeout(resolve, 150)),
                        ]);
                    } catch { }
                    window.location.assign(href);
                }
            }}
            {...rest}
        >
            {children}
        </a>
    );
}

'use client';
import { useEffect, useState } from 'react';

export function ConsentBanner() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem('consent');
        if (!consent) setVisible(true);
    }, []);

    if (!visible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 shadow p-4 flex items-center gap-3 z-50 text-white">
            <span className="text-sm">
                We use cookies for analytics and ads. Manage preferences per GDPR/CCPA.
            </span>
            <button
                className="px-3 py-1 rounded bg-blue-600 text-white text-sm"
                onClick={() => {
                    localStorage.setItem('consent', 'accepted');
                    setVisible(false);
                }}
            >
                Accept
            </button>
            <button
                className="px-3 py-1 rounded border border-gray-500 text-sm text-white"
                onClick={() => {
                    localStorage.setItem('consent', 'declined');
                    setVisible(false);
                }}
            >
                Decline
            </button>
            <div className="ml-auto flex items-center gap-3">
                <a className="text-sm underline text-blue-300" href="/privacy">
                    Privacy Policy
                </a>
                <a className="text-sm underline text-blue-300" href="/do-not-sell">
                    Do Not Sell My Info
                </a>
                <a
                    className="text-sm underline text-blue-300"
                    href="https://www.inmobi.com/cmp/"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Integrate CMP (Inmobi)
                </a>
            </div>
        </div>
    );
}

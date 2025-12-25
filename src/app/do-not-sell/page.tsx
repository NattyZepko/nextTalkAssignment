import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Do Not Sell My Info',
    description: 'CCPA opt-out information and controls.',
};

export default function DoNotSellPage() {
    return (
        <div className="space-y-4">
            <h1 className="text-2xl font-semibold">Do Not Sell My Personal Information</h1>
            <p className="text-sm text-gray-700">
                Under the CCPA, California residents may opt out of the sale or sharing of their personal information.
                We provide controls via our Consent Management Platform (CMP) to honor these choices.
            </p>
            <h2 className="text-xl font-medium">How to Opt Out</h2>
            <ul className="list-disc pl-6 text-sm text-gray-700 space-y-2">
                <li>Use the Consent banner or the “Manage preferences” control to adjust settings.</li>
                <li>When available, the CMP will present US Privacy (USP/GPP) options to opt out.</li>
                <li>You can revisit your choices at any time from the banner or debug widget.</li>
            </ul>
            <p className="text-sm text-gray-700">
                If these controls are not visible, ensure third-party scripts are enabled and the CMP is configured.
            </p>
        </div>
    );
}

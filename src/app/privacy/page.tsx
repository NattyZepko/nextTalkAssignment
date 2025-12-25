import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Privacy Policy',
    description: 'Privacy practices, GDPR & CCPA compliance for this site.',
};

export default function PrivacyPage() {
    return (
        <div className="space-y-4">
            <h1 className="text-2xl font-semibold">Privacy Policy</h1>
            <p className="text-sm text-gray-700">
                We use cookies and similar technologies to improve your experience, measure performance,
                and deliver relevant ads. We honor GDPR and CCPA requirements and provide controls to
                manage your preferences.
            </p>
            <h2 className="text-xl font-medium">GDPR & CCPA</h2>
            <ul className="list-disc pl-6 text-sm text-gray-700 space-y-2">
                <li>Consent Management Platform (CMP) is integrated to manage privacy preferences.</li>
                <li>You can accept or decline non-essential cookies via the banner and manage preferences at any time.</li>
                <li>We respect Do Not Sell or Share My Personal Information choices as applicable.</li>
            </ul>
            <h2 className="text-xl font-medium">Data Collected</h2>
            <ul className="list-disc pl-6 text-sm text-gray-700 space-y-2">
                <li>Basic request metadata (IP, User-Agent) for security and analytics.</li>
                <li>Click identifiers (e.g., gclid, fbclid) and URL parameters for attribution.</li>
                <li>Aggregate geo signals when provided by the hosting platform (country/region/city).</li>
            </ul>
            <p className="text-sm text-gray-700">
                For privacy questions or requests, please contact the site operator.
            </p>
        </div>
    );
}

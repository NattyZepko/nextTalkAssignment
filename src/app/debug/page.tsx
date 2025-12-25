export default function DebugPage() {
    return (
        <div className="space-y-4">
            <h1 className="text-xl font-semibold">Debug</h1>
            <p className="text-sm">If you see this, rendering works.</p>
            <p className="text-sm">Env flags:</p>
            <ul className="list-disc pl-6 text-sm">
                <li>Enable third-party: {String(process.env.NEXT_PUBLIC_ENABLE_THIRD_PARTY)}</li>
                <li>Gemini key: {process.env.GOOGLE_API_KEY ? 'set' : 'missing'}</li>
                <li>OpenAI key: {process.env.OPENAI_API_KEY ? 'set' : 'missing'}</li>
            </ul>
        </div>
    );
}

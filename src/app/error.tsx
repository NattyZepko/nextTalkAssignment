'use client';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
    return (
        <div className="p-6 border rounded bg-red-50">
            <h1 className="text-xl font-semibold text-red-700">Something went wrong</h1>
            <p className="text-sm mt-2">{error.message}</p>
            <button
                className="mt-4 px-3 py-1 rounded bg-blue-600 text-white text-sm"
                onClick={() => reset()}
            >
                Retry
            </button>
        </div>
    );
}

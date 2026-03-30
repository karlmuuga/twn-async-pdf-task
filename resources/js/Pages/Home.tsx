export default function Home() {
    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
            <div className="bg-white p-8 rounded-lg shadow-xl border-t-4 border-blue-500">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">
                    Infrastructure Boilerplate Ready 🚀
                </h1>
                <p className="text-gray-600">
                    TypeScript + Inertia + Tailwind v4 + Reverb + Horizon
                </p>
                <div className="mt-4 flex gap-2">
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">Dockerized</span>
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">Real-time</span>
                </div>
            </div>
        </div>
    );
}

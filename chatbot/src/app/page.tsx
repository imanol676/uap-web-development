import Chatbot from "./components/Chatbot";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24 bg-linear-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="mb-8 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-linear-to-r from-orange-600 to-amber-600 mb-3">
          📚 AI Book Manager
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-lg">
          Tu biblioteca personal inteligente
        </p>
      </div>
      <Chatbot />
    </main>
  );
}

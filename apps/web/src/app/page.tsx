import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
          Bug Slayer
        </h1>
        <p className="text-2xl text-gray-300 mb-4">
          The Debugging Dungeon
        </p>
        <p className="text-lg text-gray-400 mb-12 max-w-2xl mx-auto">
          Dive into a turn-based RPG where you battle bugs, manage Tech Debt, and master four unique developer classes.
        </p>

        <div className="flex gap-4 justify-center">
          <Link
            href="/register"
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
          >
            Start Your Journey
          </Link>
          <Link
            href="/login"
            className="px-8 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-colors"
          >
            Sign In
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-4 gap-6 text-left">
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-xl font-bold mb-2 text-blue-400">Debugger</h3>
            <p className="text-gray-400 text-sm">
              High HP and defensive skills. Perfect for beginners.
            </p>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-xl font-bold mb-2 text-green-400">Refactorer</h3>
            <p className="text-gray-400 text-sm">
              Balanced stats with versatile skills for any situation.
            </p>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-xl font-bold mb-2 text-purple-400">FullStack</h3>
            <p className="text-gray-400 text-sm">
              High damage output with powerful offensive skills.
            </p>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-xl font-bold mb-2 text-orange-400">DevOps</h3>
            <p className="text-gray-400 text-sm">
              Speed-focused with critical hits and evasion.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

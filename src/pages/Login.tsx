import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const { signInWithGoogle } = useAuth()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-6">
        <h1 className="text-3xl font-bold">📈 Stock Tracker</h1>
        <p className="text-gray-500">個人美股投資記錄</p>
        <button
          onClick={() => signInWithGoogle()}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          使用 Google 登入
        </button>
      </div>
    </div>
  )
}

import { NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/holdings', label: 'Holdings', icon: '📈' },
  { to: '/transactions', label: 'Transactions', icon: '💰' },
  { to: '/realized-pl', label: 'Realized P/L', icon: '📋' },
  { to: '/trade-pairs', label: '短線配對', icon: '🔗' },
]

export default function Sidebar() {
  const { signOut } = useAuth()

  return (
    <aside className="w-48 bg-white border-r border-gray-200 flex flex-col min-h-screen">
      <div className="p-4 border-b border-gray-200">
        <h1 className="font-bold text-gray-800">Stock Tracker</h1>
      </div>
      <nav className="flex-1 p-2">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 rounded-lg text-sm mb-1 ${
                isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
              }`
            }
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-200">
        <button onClick={signOut} className="text-sm text-gray-500 hover:text-gray-700">登出</button>
      </div>
    </aside>
  )
}

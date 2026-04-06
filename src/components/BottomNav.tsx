import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/dashboard', label: 'Dash', icon: '📊' },
  { to: '/holdings', label: 'Hold', icon: '📈' },
  { to: '/transactions', label: 'Trans', icon: '💰' },
  { to: '/realized-pl', label: 'P/L', icon: '📋' },
  { to: '/trade-pairs', label: '配對', icon: '🔗' },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex md:hidden">
      {navItems.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center py-2 text-xs ${isActive ? 'text-blue-500' : 'text-gray-500'}`
          }
        >
          <span className="text-lg">{item.icon}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

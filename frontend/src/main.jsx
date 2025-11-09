import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import Login from './Login.jsx'
import Settings from './Settings.jsx'
import UserHome from './UserHome.jsx'
import PlanDetail from './PlanDetail.jsx'
import { AuthProvider, useAuth } from './AuthContext.jsx'
import './index.css'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'

// 创建一个包装组件来处理路由逻辑
const AppWrapper = () => {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      fontSize: '18px'
    }}>
      加载中...
    </div>
  }

  // 如果用户未登录且当前不在登录页，则重定向到登录页
  if (!user && location.pathname !== '/login') {
    return <Navigate to="/login" replace />
  }

  // 如果用户已登录且在登录页，则重定向到主页
  if (user && location.pathname === '/login') {
    return <Navigate to="/user-home" replace />
  }

  return (
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/user-home" element={<UserHome />} />
      <Route path="/plan-detail" element={<PlanDetail />} />
      <Route path="/login" element={<Login />} />
      <Route path="/settings" element={<Settings />} />
    </Routes>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ConfigProvider locale={zhCN}>
    <BrowserRouter>
      <AuthProvider>
        <AppWrapper />
      </AuthProvider>
    </BrowserRouter>
  </ConfigProvider>,
)
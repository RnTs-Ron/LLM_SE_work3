import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// 注册时临时屏蔽
let ignoreNextAuthEvent = false;

// 创建Supabase客户端
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase;
if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
  console.warn('Supabase URL and/or anon key not found. Auth features will be disabled.');
}

// 导出supabase客户端实例，避免重复创建
export { supabase };

// 创建认证上下文
const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 检查当前用户会话
  useEffect(() => {
    // 如果没有配置Supabase，则跳过认证检查
    if (!supabase) {
      setLoading(false);
      return;
    }

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (ignoreNextAuthEvent) {
          ignoreNextAuthEvent = false; // 吃掉这次
          return;
        }
        setUser(session?.user || null);
        setLoading(false);
      }
    );

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);


  const signIn = async (email, password) => {
    if (!supabase) return { success: false, error: '认证服务未配置' };
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password
    });
    if (error) return { success: false, error: error.message };
    setUser(data.user);
    return { success: true };
  };
  
  const signUp = async (email, password) => {
    if (!supabase) return { success: false, error: '认证服务未配置' };
  
    ignoreNextAuthEvent = true;   // ← 先标记
  
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: password,
      options: { skipSessionCreation: true }
    });
    if (error) {
      ignoreNextAuthEvent = false; // 出错时复位
      return { success: false, error: error.message };
    }
  
    ignoreNextAuthEvent = false;   // ← 成功后复位
    return { success: true, message: '注册成功！请登录。' };
  };

  const signOut = async () => {
    if (!supabase) {
      setUser(null);
      return { success: true };
    }
    
    try {
      await supabase.auth.signOut();
      setUser(null);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
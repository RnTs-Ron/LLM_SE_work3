import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import { Layout, Form, Input, Button, Card, Typography, message, Tabs } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const Login = () => {
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const [activeTab, setActiveTab] = useState('login');
  const navigate = useNavigate();

  const handleLogin = async (values) => {
    setLoading(true);
    try {
      const result = await signIn(values.email, values.password);
      if (result.success) {
        message.success('登录成功！');
        navigate('/'); // 登录成功后跳转到主页
      } else {
        message.error(result.error || '登录失败');
      }
    } catch (error) {
      message.error('登录过程中发生错误');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (values) => {
    setLoading(true);
    try {
      const result = await signUp(values.email, values.password);
      if (result.success) {
        message.success('注册成功！请查看邮箱确认');
        setActiveTab('login'); // 注册成功后切换到登录页
      } else {
        message.error(result.error || '注册失败');
      }
    } catch (error) {
      message.error('注册过程中发生错误');
    } finally {
      setLoading(false);
    }
  };

  // 简化的邮箱验证函数
  const validateEmail = (_, value) => {
    if (!value) {
      return Promise.reject(new Error('请输入邮箱地址'));
    }
    
    // 只检查是否包含 @ 字符并且 @ 后面有内容
    const emailRegex = /^[^@]+@[^@]+$/;
    if (!emailRegex.test(value)) {
      return Promise.reject(new Error('请输入有效的邮箱地址'));
    }
    
    return Promise.resolve();
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ 
        background: '#722ed1',
        padding: '0 5%',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000
      }}>
        <Title level={3} style={{ 
          color: 'white', 
          margin: 0,
          fontWeight: 'bold'
        }}>
          智能旅行规划系统
        </Title>
      </Header>
      
      <Content style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '50px 0',
        marginTop: 64
      }}>
        <Card style={{ width: 450, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          <div style={{ textAlign: 'center', marginBottom: 30 }}>
            <Title level={2}>欢迎使用</Title>
            <Text type="secondary">智能旅行规划系统</Text>
          </div>
          
          <Tabs activeKey={activeTab} onChange={setActiveTab} centered>
            <Tabs.TabPane tab="登录" key="login">
              <Form
                name="login_form"
                onFinish={handleLogin}
                layout="vertical"
                style={{ width: '100%' }}
              >
                <Form.Item
                  name="email"
                  rules={[
                    { 
                      required: true, 
                      message: '请输入邮箱地址' 
                    },
                    {
                      validator: validateEmail
                    }
                  ]}
                >
                  <Input 
                    prefix={<UserOutlined />} 
                    placeholder="邮箱地址" 
                    size="large"
                  />
                </Form.Item>
                
                <Form.Item
                  name="password"
                  rules={[{ required: true, message: '请输入密码' }]}
                >
                  <Input.Password 
                    prefix={<LockOutlined />} 
                    placeholder="密码" 
                    size="large"
                  />
                </Form.Item>
                
                <Form.Item style={{ textAlign: 'center', marginBottom: 0 }}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    size="large"
                    loading={loading}
                    style={{ width: 140 }}
                  >
                    登录
                  </Button>
                </Form.Item>
              </Form>
            </Tabs.TabPane>
            
            <Tabs.TabPane tab="注册" key="register">
              <Form
                name="register_form"
                onFinish={handleRegister}
                layout="vertical"
                style={{ width: '100%' }}
              >
                <Form.Item
                  name="email"
                  rules={[
                    { 
                      required: true, 
                      message: '请输入邮箱地址' 
                    },
                    {
                      validator: validateEmail
                    }
                  ]}
                >
                  <Input 
                    prefix={<UserOutlined />} 
                    placeholder="邮箱地址" 
                    size="large"
                  />
                </Form.Item>
                
                <Form.Item
                  name="password"
                  rules={[
                    { required: true, message: '请输入密码' },
                    { min: 6, message: '密码至少6位' }
                  ]}
                >
                  <Input.Password 
                    prefix={<LockOutlined />} 
                    placeholder="密码（至少6位）" 
                    size="large"
                  />
                </Form.Item>
                
                <Form.Item
                  name="confirm"
                  dependencies={['password']}
                  rules={[
                    { required: true, message: '请确认密码' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('password') === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error('两次输入的密码不一致'));
                      },
                    }),
                  ]}
                >
                  <Input.Password 
                    prefix={<LockOutlined />} 
                    placeholder="确认密码" 
                    size="large"
                  />
                </Form.Item>
                
                <Form.Item style={{ textAlign: 'center', marginBottom: 0 }}>
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    size="large" 
                    loading={loading}
                    block
                  >
                    注册
                  </Button>
                </Form.Item>
              </Form>
            </Tabs.TabPane>
          </Tabs>
          
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <Button type="link" onClick={() => navigate('/settings')}>
              API 密钥设置
            </Button>
          </div>
        </Card>
      </Content>
    </Layout>
  );
};

export default Login;
 
import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import { Layout, Form, Input, Button, Card, Typography, message, Tabs, Row, Col } from 'antd';
import { UserOutlined, LockOutlined, EnvironmentOutlined, CalendarOutlined, DollarOutlined } from '@ant-design/icons';

const { Content } = Layout;
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
    <Layout style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
      <Content style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start', // 改为flex-start而不是center
        padding: '20px',
        paddingTop: '160px', // 添加顶部padding使整体上移
      }}>
        <Row gutter={24} style={{ width: '100%', maxWidth: 1200, justifyContent: 'center' }}>
          <Col xs={24} md={12}>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <Title level={3} style={{ color: '#722ed1' }}>欢迎使用智能旅行规划系统</Title>
              <Text style={{ fontSize: '16px', color: '#595959' }}>
                登录您的账户开始规划旅程
              </Text>
            </div>
            
            <Card style={{ 
              width: '100%', 
              maxWidth: 450, 
              boxShadow: '0 6px 16px rgba(0,0,0,0.15)',
              borderRadius: '12px',
              border: 'none',
              margin: '0 auto'
            }}>
              <div style={{ textAlign: 'center', marginBottom: 30 }}>
                <div style={{ 
                  width: 80, 
                  height: 80, 
                  borderRadius: '50%', 
                  background: 'linear-gradient(135deg, #722ed1 0%, #9254de 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                  boxShadow: '0 4px 12px rgba(114, 46, 209, 0.3)'
                }}>
                  <EnvironmentOutlined style={{ fontSize: '32px', color: 'white' }} />
                </div>
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
                        prefix={<UserOutlined style={{ color: '#722ed1' }} />} 
                        placeholder="邮箱地址" 
                        size="large"
                        style={{ borderRadius: '8px' }}
                      />
                    </Form.Item>
                    
                    <Form.Item
                      name="password"
                      rules={[{ required: true, message: '请输入密码' }]}
                    >
                      <Input.Password 
                        prefix={<LockOutlined style={{ color: '#722ed1' }} />} 
                        placeholder="密码" 
                        size="large"
                        style={{ borderRadius: '8px' }}
                      />
                    </Form.Item>
                    
                    <Form.Item style={{ textAlign: 'center', marginBottom: 0 }}>
                      <Button
                        type="primary"
                        htmlType="submit"
                        size="large"
                        loading={loading}
                        style={{ 
                          width: '100%', 
                          borderRadius: '8px',
                          background: 'linear-gradient(135deg, #722ed1 0%, #9254de 100%)',
                          border: 'none'
                        }}
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
                        prefix={<UserOutlined style={{ color: '#722ed1' }} />} 
                        placeholder="邮箱地址" 
                        size="large"
                        style={{ borderRadius: '8px' }}
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
                        prefix={<LockOutlined style={{ color: '#722ed1' }} />} 
                        placeholder="密码（至少6位）" 
                        size="large"
                        style={{ borderRadius: '8px' }}
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
                        prefix={<LockOutlined style={{ color: '#722ed1' }} />} 
                        placeholder="确认密码" 
                        size="large"
                        style={{ borderRadius: '8px' }}
                      />
                    </Form.Item>
                    
                    <Form.Item style={{ textAlign: 'center', marginBottom: 0 }}>
                      <Button 
                        type="primary" 
                        htmlType="submit" 
                        size="large" 
                        loading={loading}
                        block
                        style={{ 
                          borderRadius: '8px',
                          background: 'linear-gradient(135deg, #722ed1 0%, #9254de 100%)',
                          border: 'none'
                        }}
                      >
                        注册
                      </Button>
                    </Form.Item>
                  </Form>
                </Tabs.TabPane>
              </Tabs>
            </Card>
          </Col>
        </Row>
      </Content>
    </Layout>
  );
};

export default Login;
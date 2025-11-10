import React, { useEffect } from 'react';
import { Layout, Card, Form, Input, Button, message, Typography, Divider, Tabs } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { LogoutOutlined, HomeOutlined } from '@ant-design/icons';

const { Header, Content } = Layout;
const { Title } = Typography;

const Settings = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  // 回填
  useEffect(() => {
    const raw = localStorage.getItem('travelPlannerSettings');
    if (raw) try { form.setFieldsValue(JSON.parse(raw)); } catch {}
  }, [form]);

  // 保存
  const handleSave = v => {
    localStorage.setItem('travelPlannerSettings', JSON.stringify(v));
    message.success('已保存');
  };

  // 测试 LLM
  const testLLM = async () => {
    const { llmApiKey } = form.getFieldsValue(true);
    if (!llmApiKey) return message.warning('请先填写 Key');
    try {
      const res = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${llmApiKey}` },
        body: JSON.stringify({ model: 'qwen-turbo', messages: [{ role: 'user', content: '你好' }] })
      });
      const data = await res.json();
      if (res.ok && data.choices?.[0]?.message?.content) message.success('通义Key 有效');
      else message.error('Key 无效：' + (data.error?.message || '未知错误'));
    } catch (e) { message.error('网络错误：' + e.message); }
  };

  // 测试高德
  const testAmap = async () => {
    const { amapApiKey } = form.getFieldsValue(true);
    if (!amapApiKey) return message.warning('请先填写高德 Key');
    if (amapApiKey.length < 20) return message.error('高德 Key 格式太短');
    
    try {
      // 调用高德地图API测试Key有效性
      const response = await fetch(`https://restapi.amap.com/v3/ip?output=json&key=${amapApiKey}`);
      const data = await response.json();
      
      if (data.status === '1') {
        message.success('高德 Key 有效');
      } else {
        message.error('高德 Key 无效: ' + (data.info || '未知错误'));
      }
    } catch (e) {
      message.error('网络错误: ' + e.message);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      message.success('已退出登录');
      navigate('/login');
    } catch (error) {
      message.error('退出登录失败');
    }
  };

  // antd v5 items 写法，不再用废弃 TabPane
  const tabItems = [
    {
      key: 'api',
      label: '',
      children: (
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Divider>高德地图</Divider>
          <Form.Item name="amapApiKey" label="高德 Key">
            <Input.Password placeholder="高德地图 Key" size="large" />
          </Form.Item>
          <Form.Item>
            <Button onClick={testAmap} style={{ marginRight: 8 }}>测试</Button>
          </Form.Item>

          <Divider>通义千问</Divider>
          <Form.Item name="llmApiKey" label="通义 Key">
            <Input.Password placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" size="large" />
          </Form.Item>
          <Form.Item>
            <Button onClick={testLLM} style={{ marginRight: 8 }}>测试</Button>
          </Form.Item>
          
          <Form.Item>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
              <Button type="primary" htmlType="submit">保存</Button>
              <Button onClick={() => navigate('/')}>返回首页</Button>
            </div>
          </Form.Item>
        </Form>
      )
    }
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ 
        background: '#722ed1',
        padding: '0 5%',
        boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          height: '100%'
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Title level={3} style={{ 
              color: 'white', 
              margin: 0,
              fontWeight: 'bold'
            }}>
              系统设置
            </Title>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Button 
              type="link" 
              onClick={() => navigate('/')}
              style={{ color: 'white', marginRight: 16 }}
            >
              <HomeOutlined /> 首页
            </Button>
            <Button 
              type="text" 
              icon={<LogoutOutlined />} 
              onClick={handleSignOut}
              style={{ color: 'white' }}
            >
              退出
            </Button>
          </div>
        </div>
      </Header>
      
      <Content style={{ 
        padding: '24px 5%', 
        background: '#fff',
        minHeight: 'calc(100vh - 64px)',
        marginTop: 64
      }}>
        <Card style={{ width: '100%', maxWidth: 600, margin: '0 auto' }}>
          <Tabs items={tabItems} />
          <div style={{ textAlign: 'left', paddingTop: 72, color: '#999999' }}>
            <ul>
              <li>通义千问 Key：<a href="https://bailian.console.aliyun.com" target="_blank" rel="noreferrer">百炼控制台</a></li>
              <li>高德地图 Key：<a href="https://console.amap.com" target="_blank" rel="noreferrer">高德开放平台</a></li>
              <li>语音功能使用浏览器原生语音接口，确保浏览器支持语音识别</li>
              <li>填写后务必点击「保存」</li>
            </ul>
          </div>
        </Card>
      </Content>
    </Layout>
  );
};

export default Settings;
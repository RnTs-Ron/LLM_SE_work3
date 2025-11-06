import React, { useEffect } from 'react';
import { Card, Form, Input, Button, message, Typography, Divider, Tabs } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

const { Title } = Typography;

const Settings = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { user } = useAuth();

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
      if (res.ok && data.choices?.[0]?.message?.content) message.success('Key 有效');
      else message.error('Key 无效：' + (data.error?.message || '未知错误'));
    } catch (e) { message.error('网络错误：' + e.message); }
  };

  // 测试高德
  const testAmap = () => {
    const { amapApiKey } = form.getFieldsValue(true);
    if (!amapApiKey || amapApiKey.length < 20) return message.error('格式太短');
    message.success('高德 Key 格式校验通过');
  };

  // antd v5 items 写法，不再用废弃 TabPane
  const tabItems = [
    {
      key: 'api',
      label: 'API 密钥',
      children: (
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Divider>高德地图</Divider>
          <Form.Item name="amapApiKey" label="Web 端 Key" extra="保存后刷新页面生效">
            <Input.Password placeholder="高德地图 Key" size="large" />
          </Form.Item>
          <Form.Item>
            <Button onClick={testAmap} style={{ marginRight: 8 }}>测试</Button>
          </Form.Item>

          <Divider>通义千问</Divider>
          <Form.Item name="llmApiKey" label="兼容模式 API Key">
            <Input.Password placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" size="large" />
          </Form.Item>
          <Form.Item>
            <Button onClick={testLLM} style={{ marginRight: 8 }}>测试</Button>
            <Button type="primary" htmlType="submit">保存</Button>
          </Form.Item>
        </Form>
      )
    },
    {
      key: 'help',
      label: '使用说明',
      children: (
        <ul>
          <li>通义千问 Key：<a href="https://bailian.console.aliyun.com" target="_blank" rel="noreferrer">百炼控制台</a></li>
          <li>高德 Key：<a href="https://console.amap.com" target="_blank" rel="noreferrer">高德开放平台</a></li>
          <li>填写后务必点击「保存」</li>
        </ul>
      )
    }
  ];

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '50px 20px', minHeight: '100vh', background: '#f0f2f5' }}>
      <Card style={{ width: '100%', maxWidth: 600 }}>
        <Title level={2} style={{ textAlign: 'center', marginBottom: 32 }}>系统设置</Title>
        <Tabs items={tabItems} />
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Button onClick={() => navigate('/')}>返回首页</Button>
        </div>
      </Card>
    </div>
  );
};

export default Settings;
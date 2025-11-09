import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Card, List, Typography, Button, message, Avatar, Popconfirm } from 'antd';
import { 
  EnvironmentOutlined, 
  ClockCircleOutlined, 
  CalendarOutlined, 
  DollarCircleOutlined,
  CheckCircleOutlined,
  ArrowLeftOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { deleteTravelPlan } from './api/supabase';

const { Header, Content, Footer } = Layout;
const { Title, Text, Paragraph } = Typography;

const PlanDetail = () => {
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);

  useEffect(() => {
    // 从localStorage获取当前计划
    const savedPlan = localStorage.getItem('current_plan');
    if (savedPlan) {
      try {
        setPlan(JSON.parse(savedPlan));
      } catch (error) {
        console.error('解析计划数据失败:', error);
        message.error('加载计划详情失败');
      }
    } else {
      message.info('未找到计划数据');
      navigate('/user-home');
    }
  }, []);

  // 计算总预算
  const calculateTotalBudget = (dailyPlan) => {
    if (!dailyPlan || dailyPlan.length === 0) return '¥0';
    
    let total = 0;
    
    dailyPlan.forEach(day => {
      const budgetText = day.daily_plan || day.budget || ''; // 兼容不同的数据结构
      // 提取预算中的所有数字并相加
      const numbers = budgetText.match(/\d+/g);
      if (numbers) {
        numbers.forEach(num => {
          total += parseInt(num, 10);
        });
      }
    });
    
    return `¥${total}`;
  };

  const handleDeletePlan = async () => {
    if (!plan) return;
    
    try {
      const result = await deleteTravelPlan(plan.id);
      if (result.success) {
        message.success('计划已删除');
        // 返回用户主页
        navigate('/user-home');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('删除计划失败:', error);
      message.error('删除计划失败: ' + error.message);
    }
  };

  if (!plan) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Typography.Title level={4}>加载中...</Typography.Title>
      </div>
    );
  }

  // 旅行计划基本信息数据
  const planInfoData = [
    { icon: <EnvironmentOutlined />, title: '路线', value: plan.origin ? `${plan.origin} → ${plan.destination}` : plan.destination },
    { icon: <ClockCircleOutlined />, title: '行程时长', value: plan.duration },
    { icon: <CalendarOutlined />, title: '出发日期', value: plan.start_date || plan.startDate },
    { icon: <DollarCircleOutlined />, title: '预算', value: plan.budget },
    { icon: <DollarCircleOutlined />, title: '总花费', value: calculateTotalBudget(plan.daily_plan || plan.dailyPlan) }
  ];

  const dailyPlan = plan.daily_plan || plan.dailyPlan;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ 
        background: '#722ed1',
        padding: '0 5%',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
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
              旅行计划详情
            </Title>
          </div>
          <div>
            <Popconfirm
              title="确定要删除这个旅行计划吗？"
              description={`计划: ${plan.origin ? `${plan.origin}→${plan.destination}` : plan.destination}`}
              onConfirm={handleDeletePlan}
              okText="确定"
              cancelText="取消"
            >
              <Button 
                type="text" 
                icon={<DeleteOutlined />} 
                style={{ color: 'white', marginRight: 16 }}
              />
            </Popconfirm>
            <Button 
              type="text" 
              icon={<ArrowLeftOutlined />} 
              onClick={() => navigate('/user-home')}
              style={{ color: 'white' }}
            />
          </div>
        </div>
      </Header>
      
      <Content style={{ 
        padding: '24px 5%', 
        background: '#fff',
        minHeight: 'calc(100vh - 64px - 69px)'
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Card title="基本信息" style={{ marginBottom: 24 }}>
            <List
              itemLayout="horizontal"
              dataSource={planInfoData}
              renderItem={item => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Avatar icon={item.icon} />}
                    title={item.title}
                    description={<Text strong>{item.value}</Text>}
                  />
                </List.Item>
              )}
            />
            
            {(plan.highlights || plan.highlights?.length > 0) && (
              <>
                <div style={{ margin: '16px 0' }}><Text strong>亮点推荐</Text></div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {(plan.highlights || []).map((highlight, index) => (
                    <span 
                      key={index}
                      style={{
                        background: '#e6f7ff',
                        border: '1px solid #91d5ff',
                        borderRadius: 4,
                        padding: '4px 8px',
                        fontSize: '12px'
                      }}
                    >
                      {highlight}
                    </span>
                  ))}
                </div>
              </>
            )}
          </Card>

          <Card 
            title="详细行程" 
            extra={
              <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                总花费: {calculateTotalBudget(dailyPlan)}
              </div>
            }
          >
            <List
              itemLayout="vertical"
              dataSource={dailyPlan}
              renderItem={(item, index) => (
                <List.Item style={{ alignItems: 'flex-start' }}>
                  <List.Item.Meta
                    avatar={
                      <Avatar 
                        style={{ backgroundColor: '#1890ff' }}
                      >
                        第{index+1}天
                      </Avatar>
                    }
                    description={
                      <div>
                        <Paragraph style={{ fontSize: '16px', marginBottom: 8 }}>
                          {typeof item === 'string' ? item : (item.description || item)}
                        </Paragraph>
                        {(item.budget || item.daily_plan) && (
                          <Paragraph style={{ 
                            fontSize: '14px', 
                            marginBottom: 0,
                            padding: '8px 12px',
                            backgroundColor: '#f6ffed',
                            border: '1px solid #b7eb8f',
                            borderRadius: 4
                          }}>
                            <strong>预算:</strong> {item.budget || item.daily_plan}
                          </Paragraph>
                        )}
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </div>
      </Content>
      
      <Footer style={{ 
        textAlign: 'center', 
        background: '#f0f2f5',
        borderTop: '1px solid #e8e8e8',
        padding: '16px 5%'
      }}>
        <Text type="secondary">智能旅行规划系统 ©{new Date().getFullYear()} 让每一次旅行都成为美好回忆</Text>
      </Footer>
    </Layout>
  );
};

export default PlanDetail;
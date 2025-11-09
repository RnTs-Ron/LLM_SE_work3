import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import { Layout, List, Card, Button, Typography, message, Spin, Empty, Avatar, Popconfirm } from 'antd';
import { 
  EnvironmentOutlined, 
  ClockCircleOutlined, 
  CalendarOutlined, 
  DollarCircleOutlined,
  LogoutOutlined,
  PlusOutlined,
  HomeOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { getUserTravelPlans, deleteTravelPlan } from './api/supabase';

const { Header, Content, Footer } = Layout;
const { Title, Text } = Typography;

// 辅助函数：获取出发地->目的地文本
const getOriginDestinationText = (plan) => {
  // 如果有出发地信息，则显示"出发地->目的地"
  if (plan.origin) {
    return `${plan.origin}→${plan.destination}`;
  }
  // 否则只显示目的地
  return plan.destination;
};

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

const UserHome = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserPlans();
  }, [user]);

  const fetchUserPlans = async () => {
    if (!user) return;
    
    try {
      // 从Supabase获取用户计划
      const result = await getUserTravelPlans(user.id);
      
      if (result.success) {
        setPlans(result.data);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('获取用户计划失败:', error);
      message.error('获取旅行计划失败: ' + error.message);
    } finally {
      setLoading(false);
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

  const handleViewPlan = (plan) => {
    // 导航到计划详情页面
    localStorage.setItem('current_plan', JSON.stringify(plan));
    navigate('/plan-detail');
  };

  const handleCreateNewPlan = () => {
    navigate('/');
  };

  const handleDeletePlan = async (planId, planName) => {
    try {
      const result = await deleteTravelPlan(planId);
      if (result.success) {
        message.success(`计划"${planName}"已删除`);
        // 重新获取计划列表
        fetchUserPlans();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('删除计划失败:', error);
      message.error('删除计划失败: ' + error.message);
    }
  };

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
              我的旅行计划
            </Title>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Button 
              type="link" 
              onClick={() => navigate('/')}
              style={{ color: 'white', marginRight: 16 }}
            >
              <HomeOutlined /> 主页
            </Button>
            <Text style={{ color: 'white', marginRight: 16 }}>欢迎您, {user?.email}</Text>
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
        minHeight: 'calc(100vh - 64px - 69px)',
        marginTop: 64
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: 24,
          maxWidth: '800px',  // 与卡片最大宽度保持一致
          margin: '0 auto 24px auto'  // 居中显示
        }}>
          <Title level={4} style={{ margin: 0 }}> </Title>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={handleCreateNewPlan}
          >
            创建新计划
          </Button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Spin size="large" />
          </div>
        ) : plans.length === 0 ? (
          <Card>
            <Empty 
              description="暂无旅行计划" 
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Button type="primary" onClick={handleCreateNewPlan}>
                创建第一个旅行计划
              </Button>
            </Empty>
          </Card>
        ) : (
          <List
            grid={{ gutter: 16, column: 1 }}
            dataSource={plans}
            renderItem={plan => (
              <List.Item>
                <Card 
                  hoverable
                  onClick={() => handleViewPlan(plan)}
                  style={{ 
                    cursor: 'pointer',
                    maxWidth: '800px',  // 限制最大宽度
                    margin: '0 auto'    // 居中显示
                  }}
                >
                  <Card.Meta
                    avatar={
                      <Avatar 
                        style={{ backgroundColor: '#722ed1' }} 
                        icon={<EnvironmentOutlined />}
                      />
                    }
                    title={
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{getOriginDestinationText(plan)}</span>
                        <Text strong>{plan.budget}</Text>
                      </div>
                    }
                    description={
                      <div style={{ marginTop: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                          <CalendarOutlined style={{ marginRight: 8 }} />
                          <Text type="secondary">{plan.start_date || plan.startDate}</Text>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                          <ClockCircleOutlined style={{ marginRight: 8 }} />
                          <Text type="secondary">{plan.duration}</Text>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                          <DollarCircleOutlined style={{ marginRight: 8 }} />
                          <Text type="secondary">总花费: {calculateTotalBudget(plan.daily_plan || plan.dailyPlan)}</Text>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                          <Popconfirm
                            title="确定要删除这个旅行计划吗？"
                            description={`计划: ${getOriginDestinationText(plan)}`}
                            onConfirm={(e) => {
                              e.stopPropagation();
                              handleDeletePlan(plan.id, getOriginDestinationText(plan));
                            }}
                            onCancel={(e) => e.stopPropagation()}
                            okText="确定"
                            cancelText="取消"
                          >
                            <Button 
                              type="text" 
                              icon={<DeleteOutlined />} 
                              onClick={(e) => e.stopPropagation()}
                              danger
                            />
                          </Popconfirm>
                        </div>
                      </div>
                    }
                  />
                </Card>
              </List.Item>
            )}
          />
        )}
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

export default UserHome;
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Card, List, Typography, Button, message, Avatar, Popconfirm, Tag, Descriptions, Badge, Space } from 'antd';
import { 
  EnvironmentOutlined, 
  ClockCircleOutlined, 
  CalendarOutlined, 
  DollarCircleOutlined,
  CheckCircleOutlined,
  ArrowLeftOutlined,
  DeleteOutlined,
  StarOutlined,
  CarOutlined,
  HomeOutlined,
  ShoppingOutlined,
  TeamOutlined
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
    { icon: <EnvironmentOutlined style={{ fontSize: '20px' }} />, title: '路线', value: plan.origin ? `${plan.origin} → ${plan.destination}` : plan.destination },
    { icon: <ClockCircleOutlined style={{ fontSize: '20px' }} />, title: '行程时长', value: plan.duration },
    { icon: <CalendarOutlined style={{ fontSize: '20px' }} />, title: '出发日期', value: plan.start_date || plan.startDate },
    { icon: <DollarCircleOutlined style={{ fontSize: '20px' }} />, title: '预算', value: plan.budget },
    { icon: <DollarCircleOutlined style={{ fontSize: '20px' }} />, title: '总花费', value: calculateTotalBudget(plan.daily_plan || plan.dailyPlan) }
  ];

  const dailyPlan = plan.daily_plan || plan.dailyPlan;

  // 解析预算信息
  const parseBudgetInfo = (budgetText) => {
    if (!budgetText) return [];
    
    const budgetItems = [];
    
    // 住宿
    const zhuMatch = budgetText.match(/住宿:\s*¥(\d+)/);
    if (zhuMatch) {
      budgetItems.push({
        icon: <HomeOutlined />,
        label: '住宿',
        value: `¥${zhuMatch[1]}`
      });
    }
    
    // 餐饮
    const canMatch = budgetText.match(/餐饮:\s*¥(\d+)/);
    if (canMatch) {
      budgetItems.push({
        icon: <TeamOutlined />,
        label: '餐饮',
        value: `¥${canMatch[1]}`
      });
    }
    
    // 交通
    const jiaoMatch = budgetText.match(/交通:\s*¥(\d+)/);
    if (jiaoMatch) {
      budgetItems.push({
        icon: <CarOutlined />,
        label: '交通',
        value: `¥${jiaoMatch[1]}`
      });
    }
    
    // 门票
    const menMatch = budgetText.match(/门票:\s*¥(\d+)/);
    if (menMatch) {
      budgetItems.push({
        icon: <StarOutlined />,
        label: '门票',
        value: `¥${menMatch[1]}`
      });
    }
    
    // 购物
    const shoppingMatch = budgetText.match(/购物:\s*¥(\d+)/);
    if (shoppingMatch) {
      budgetItems.push({
        icon: <ShoppingOutlined />,
        label: '购物',
        value: `¥${shoppingMatch[1]}`
      });
    }
    
    // 娱乐
    const entertainmentMatch = budgetText.match(/娱乐:\s*¥(\d+)/);
    if (entertainmentMatch) {
      budgetItems.push({
        icon: <StarOutlined />,
        label: '娱乐',
        value: `¥${entertainmentMatch[1]}`
      });
    }
    
    // 大交通
    const bigTrafficMatch = budgetText.match(/往返大交通:\s*¥(\d+)/);
    if (bigTrafficMatch) {
      budgetItems.push({
        icon: <CarOutlined />,
        label: '往返大交通',
        value: `¥${bigTrafficMatch[1]}`
      });
    }
    
    return budgetItems;
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ 
        background: 'linear-gradient(135deg, #722ed1 0%, #531dab 100%)',
        padding: '0 5%',
        boxShadow: '0 2px 12px rgba(0,0,0,0.15)'
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
              fontWeight: 'bold',
              textShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}>
              <EnvironmentOutlined style={{ marginRight: 12 }} />
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
        padding: '0', 
        background: 'linear-gradient(to bottom, #f0f2f5, #ffffff)',
        minHeight: 'calc(100vh - 64px - 69px)'
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 5%' }}>
          <Card 
            title={
              <Space>
                <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '24px' }} />
                <span>基本信息</span>
              </Space>
            } 
            style={{ 
              marginBottom: 24,
              borderRadius: 12,
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
            }}
            headStyle={{
              background: 'linear-gradient(to right, #f9f0ff, #f0f5ff)',
              borderBottom: '1px solid #e8e8e8',
              borderRadius: '12px 12px 0 0'
            }}
          >
            <Descriptions 
              column={{ xs: 1, sm: 2, md: 3 }} 
              bordered
              size="middle"
              labelStyle={{
                fontWeight: 'bold',
                backgroundColor: '#fafafa'
              }}
            >
              <Descriptions.Item label={<><EnvironmentOutlined /> 路线</>}>
                <Text strong style={{ fontSize: '16px' }}>
                  {plan.origin ? `${plan.origin} → ${plan.destination}` : plan.destination}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label={<><ClockCircleOutlined /> 行程时长</>}>
                <Badge 
                  count={plan.duration} 
                  style={{ backgroundColor: '#722ed1' }} 
                  overflowCount={99}
                />
              </Descriptions.Item>
              <Descriptions.Item label={<><CalendarOutlined /> 出发日期</>}>
                <Text strong>{plan.start_date || plan.startDate}</Text>
              </Descriptions.Item>
              <Descriptions.Item label={<><DollarCircleOutlined /> 预算</>}>
                <Tag icon={<DollarCircleOutlined />} color="green">
                  {plan.budget}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={<><DollarCircleOutlined /> 总花费</>}>
                <Tag icon={<DollarCircleOutlined />} color="blue">
                  {calculateTotalBudget(plan.daily_plan || plan.dailyPlan)}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
            
            {(plan.highlights || plan.highlights?.length > 0) && (
              <Card 
                title={<><StarOutlined style={{ color: '#faad14' }} /> 亮点推荐</>} 
                style={{ 
                  marginTop: 24,
                  background: 'linear-gradient(to right, #fffbe6, #ffffff)',
                  borderRadius: 8
                }}
                headStyle={{ 
                  borderBottom: '1px solid #ffe58f',
                  padding: '0 12px'
                }}
              >
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  {(plan.highlights || []).map((highlight, index) => (
                    <Tag 
                      key={index}
                      icon={<StarOutlined />}
                      color="gold"
                      style={{
                        padding: '6px 12px',
                        fontSize: '14px',
                        borderRadius: 20
                      }}
                    >
                      {highlight}
                    </Tag>
                  ))}
                </div>
              </Card>
            )}
          </Card>

          <Card 
            title={
              <Space>
                <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '24px' }} />
                <span>详细行程</span>
              </Space>
            } 
            extra={
              <Tag 
                icon={<DollarCircleOutlined />} 
                color="blue" 
                style={{ 
                  fontSize: '16px', 
                  padding: '6px 12px',
                  borderRadius: 20
                }}
              >
                总花费: {calculateTotalBudget(dailyPlan)}
              </Tag>
            }
            style={{ 
              borderRadius: 12,
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
            }}
            headStyle={{
              background: 'linear-gradient(to right, #f0f5ff, #f9f0ff)',
              borderBottom: '1px solid #e8e8e8',
              borderRadius: '12px 12px 0 0'
            }}
          >
            <List
              itemLayout="vertical"
              dataSource={dailyPlan}
              renderItem={(item, index) => {
                const budgetItems = parseBudgetInfo(item.budget || item.daily_plan);
                return (
                  <List.Item 
                    style={{ 
                      alignItems: 'flex-start',
                      padding: '24px 0',
                      borderBottom: '1px dashed #e8e8e8'
                    }}
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar 
                          style={{ 
                            backgroundColor: '#1890ff',
                            width: 50,
                            height: 50,
                            lineHeight: '50px',
                            fontSize: '18px',
                            fontWeight: 'bold'
                          }}
                        >
                          第{index+1}天
                        </Avatar>
                      }
                      title={
                        <Title level={4} style={{ margin: '8px 0' }}>
                          {typeof item === 'string' ? `第${index+1}天行程` : (item.description || item)}
                        </Title>
                      }
                      description={
                        <div>
                          {budgetItems.length > 0 && (
                            <Card 
                              title={<><DollarCircleOutlined style={{ color: '#52c41a' }} /> 预算明细</>} 
                              size="small"
                              style={{ 
                                background: 'linear-gradient(to right, #f6ffed, #ffffff)',
                                borderRadius: 8
                              }}
                              headStyle={{ 
                                borderBottom: '1px solid #b7eb8f',
                                padding: '0 12px'
                              }}
                            >
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                                {budgetItems.map((budgetItem, budgetIndex) => (
                                  <Tag 
                                    key={budgetIndex}
                                    icon={budgetItem.icon}
                                    color="success"
                                    style={{
                                      padding: '6px 12px',
                                      fontSize: '14px',
                                      borderRadius: 20
                                    }}
                                  >
                                    {budgetItem.label}: {budgetItem.value}
                                  </Tag>
                                ))}
                              </div>
                            </Card>
                          )}
                        </div>
                      }
                    />
                  </List.Item>
                );
              }}
            />
          </Card>
        </div>
      </Content>
      
      <Footer style={{ 
        textAlign: 'center', 
        background: 'linear-gradient(to right, #f0f2f5, #ffffff)',
        borderTop: '1px solid #e8e8e8',
        padding: '24px 5%'
      }}>
        <Text type="secondary" style={{ fontSize: '16px' }}>
          <EnvironmentOutlined style={{ marginRight: 8 }} />
          智能旅行规划系统 ©{new Date().getFullYear()} 让每一次旅行都成为美好回忆
        </Text>
      </Footer>
    </Layout>
  );
};

export default PlanDetail;
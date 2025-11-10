import { supabase } from '../AuthContext';

// 保存旅行计划到Supabase数据库
export const saveTravelPlan = async (user_id, planData) => {
  try {
    const { data, error } = await supabase
      .from('travel_plans')
      .insert([
        {
          user_id: user_id,
          origin: planData.origin,
          destination: planData.destination,
          duration: planData.duration,
          start_date: planData.startDate,
          budget: planData.budget,
          highlights: planData.highlights,
          route_points: planData.routePoints,
          daily_plan: planData.dailyPlan,
          preferences: planData.preferences || [], // 添加preferences字段
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('保存计划到数据库时出错:', error);
    return { success: false, error: error.message };
  }
};

// 获取用户的旅行计划
export const getUserTravelPlans = async (user_id) => {
  try {
    const { data, error } = await supabase
      .from('travel_plans')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('获取用户计划时出错:', error);
    return { success: false, error: error.message };
  }
};

// 获取特定旅行计划的详细信息
export const getTravelPlanById = async (plan_id) => {
  try {
    const { data, error } = await supabase
      .from('travel_plans')
      .select('*')
      .eq('id', plan_id)
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('获取计划详情时出错:', error);
    return { success: false, error: error.message };
  }
};

// 删除旅行计划
export const deleteTravelPlan = async (plan_id) => {
  try {
    const { data, error } = await supabase
      .from('travel_plans')
      .delete()
      .eq('id', plan_id);

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('删除计划时出错:', error);
    return { success: false, error: error.message };
  }
};
import { travelPlannerSystemPrompt } from './prompts/travelPlannerPrompt';
import { message } from 'antd';

/* 工具：从字符串里抠最外层 {} 并解析 */
export function extractJSON(str) {
  const m = str.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}

/* 统一降级方案：resolve 必定返回 { ok:true, data: TravelPlan } 或 { ok:false, msg } */
export async function planTrip({
  userInput,          // 用户本轮原始文字
  history = [],       // 最近 6 轮对话记录 [{role,content}]
  budget,
  destination,
  days,
  apiKey = '',        // 通义 Key（空串就走降级）
}) {
  const budgetReminder = `（请把每日花费累加，总花费必须≥${budget * 0.8}且≤${budget}，否则请调整酒店/餐饮档次，万不得已才超并在JSON前说明原因）`;
  const messages = [
    { role: 'system', content: travelPlannerSystemPrompt },
    ...history,
    { role: 'user', content: `去${destination}，${days}天，预算${budget}元${budgetReminder}` },
  ];

  /* 1. 没 Key → 直接降级 */
  if (!apiKey) return simulatePlan({ destination, days, budget });

  /* 2. 调通义千问 */
  try {
    const res = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'qwen-turbo',
        temperature: 0.7,
        messages,
      }),
    });
    if (!res.ok) throw new Error(`千问异常 ${res.status}`);
    const ans = await res.json();
    const raw = ans.choices?.[0]?.message?.content ?? '';
    const json = extractJSON(raw);
    if (!json) throw new Error('未返回合法 JSON');

    /* 3. 超预算说明在前，先剥离 */
    const extraNote = raw.replace(/\{[\s\S]*\}/, '').trim();
    return { ok: true, data: normalizePlan(json), extraNote };
  } catch (e) {
    console.error('[LLM]', e);
    message.warning('大模型调用失败，已自动切换模拟数据');
    return simulatePlan({ destination, days, budget });
  }
}

/* 把千问/模拟字段洗成前端需要的统一结构 */
function normalizePlan(j) {
  return {
    destination: j.destination,
    duration   : j.duration,
    startDate  : j.startDate,
    budget     : j.budget,
    highlights : j.highlights ?? [],
    routePoints: j.routePoints ?? [],
    dailyPlan  : Array.isArray(j.dailyPlan)
      ? j.dailyPlan.map((item) =>
          typeof item === 'string' ? { description: item, budget: '预算待定' } : item
        )
      : [],
  };
}

/* 降级：生成与上海同级的假数据，但保证预算落在 80~100% */
function simulatePlan({ destination, days, budget }) {
  const b = Number(budget);
  const avg = Math.round(b / days);
  const dailyPlan = Array.from({ length: days }, (_, i) => ({
    description: `第${i + 1}天：参观${destination}经典景点，品尝当地美食`,
    budget: `门票:¥${Math.round(avg * 0.3)} 餐饮:¥${Math.round(avg * 0.4)} 交通:¥${Math.round(avg * 0.3)}`,
  }));
  const plan = {
    destination,
    duration: `${days}天`,
    startDate: '2025-11-15',
    budget: `¥${budget}/人`,
    highlights: ['外滩夜景', '豫园', '迪士尼', '南京路'],
    routePoints: [
      { name: '浦东机场', lat: 31.1559, lng: 121.8053 },
      { name: '外滩', lat: 31.2363, lng: 121.4903 },
      { name: '豫园', lat: 31.2279, lng: 121.4922 },
      { name: '迪士尼', lat: 31.1439, lng: 121.6579 },
      { name: '南京路', lat: 31.2346, lng: 121.4797 },
      { name: '虹桥机场', lat: 31.1959, lng: 121.3333 },
    ],
    dailyPlan,
  };
  return { ok: true, data: plan };
}
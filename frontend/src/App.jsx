import React, { useState, useEffect, useRef } from 'react';
import { parseBudget } from './utils/chineseBudget';
// 放在 util.js 或直接贴 App.jsx 顶部
function extractJSON(str) {
  // 匹配最外层 {} 里的全部内容
  const match = str.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

// 计算总预算
const calculateTotalBudget = (dailyPlan) => {
  if (!dailyPlan || dailyPlan.length === 0) return '¥0';
  
  let total = 0;
  
  dailyPlan.forEach(day => {
    const budgetText = day.budget || '';
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

import './App.css';
import { Layout, Button, Card, Row, Col, Typography, Input, Space, Avatar, List, Divider, Steps, message, Modal } from 'antd';
import {
  SendOutlined,
  RobotOutlined,
  UserOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  DollarCircleOutlined,
  CheckCircleOutlined,
  AudioOutlined,
  CalendarOutlined,
  LogoutOutlined,
  SaveOutlined
} from '@ant-design/icons';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import { travelPlannerSystemPrompt } from './prompts/travelPlannerPrompt';
import { saveTravelPlan } from './api/supabase';

const { Header, Content, Footer } = Layout;
const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Step } = Steps;

function App() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: '嗨！我是您的专属旅行规划师小旅～有什么我可以帮您的吗？'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [travelPlan, setTravelPlan] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const amapScriptLoaded = useRef(false);
  const recognitionRef = useRef(null);

  const handleSend = () => {
    if (inputValue.trim() === '' || isProcessing) return;
    
    // 添加用户消息
    const newUserMessage = {
      id: Date.now(),
      sender: 'user',
      text: inputValue
    };
    
    setMessages(prev => [...prev, newUserMessage]);
    setInputValue('');
    setIsProcessing(true);
    setCurrentStep(0);
    setTravelPlan(null);
    
    // 使用AI大语言模型处理用户请求
    processWithLLM(inputValue);
  };

  // 语音输入功能接口
  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      message.error('您的浏览器不支持语音识别功能，请使用最新版Chrome浏览器');
      console.log('浏览器不支持语音识别功能');
      return;
    }

    // 如果正在识别，停止识别
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      return;
    }

    // 创建语音识别实例
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    // 设置识别参数
    recognition.lang = 'zh-CN'; // 设置为中文识别
    recognition.continuous = false; // 只识别一次
    recognition.interimResults = false; // 不返回中间结果

    recognition.onstart = () => {
      console.log('语音识别开始');
      message.info('正在聆听...再次点击结束');
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      console.log('语音识别结果:', transcript);
      setInputValue(prevValue => prevValue + transcript);
      message.success('语音识别完成');
    };

    recognition.onerror = (event) => {
      console.error('语音识别出错:', event.error);
      message.error(`语音识别出错: ${event.error}`);
    };

    recognition.onend = () => {
      console.log('语音识别结束');
      recognitionRef.current = null;
    };

    // 开始识别
    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (error) {
      console.error('启动语音识别失败:', error);
      message.error('启动语音识别失败');
    }
  };

  // App.jsx 内
  let planningLock = false;
  const setPlanningLock = (value) => {
    planningLock = value;
  };

  // 用户旅行计划信息的状态管理 - 使用useRef保持持久性
  const travelInfoRef = useRef({
    origin: null,      // 出发地
    destination: null, // 目的地
    days: null,        // 天数
    budget: null,      // 预算
    people: null       // 人数
  });

  // 检查旅行信息是否完整
  const isTravelInfoComplete = (info) => {
    return info.origin && info.destination && info.days && info.budget && info.people;
  };

  // 从用户输入中提取信息
  function extractInfoFromInput(input) {
    const info = {};
  
    /* 1. 出发地 + 目的地  支持「从A到B」 */
    const fromToMatch = input.match(/从(.+?)到(.+)/);
    if (fromToMatch) {
      let fromCity = fromToMatch[1].trim().replace(/[，,\s。]+$/, '');
      let toCity   = fromToMatch[2].trim().replace(/[，,\s。]+$/, '');
  
      /* 1.1 天数：优先在 toCity 找 */
      const daysMatch = toCity.match(/(\d{1,2})[天日]|(?:住|玩|行程|计划)(\d{1,2})[天日]/);
      if (daysMatch) info.days = daysMatch[1] || daysMatch[2];
  
      /* 1.2 预算：统一用 parseBudget（支持 5千/5万/1.5万/一万二千） */
      const budget = parseBudget(toCity);
      if (budget) info.budget = String(budget);
      
      /* 1.3 人数：查找人数信息 */
      const peopleMatch = toCity.match(/(\d{1,2})[人个]|(?:我们|一共|总共)(\d{1,2})[人个]/);
      if (peopleMatch) info.people = peopleMatch[1] || peopleMatch[2];
  
      /* 1.4 清理 toCity 里的天数/预算词，剩下就是目的地 */
      const cleanDest = toCity
        .replace(/(\d{1,2})[天日]|(?:住|玩|行程|计划)(\d{1,2})[天日]/, '')
        .replace(/(\d+\.?\d*[万千百]?[元块]?预算|预算.*?[万千百])/g, '')
        .replace(/(\d{1,2})[人个]|(?:我们|一共|总共)(\d{1,2})[人个]/, '')
        .trim();
      if (cleanDest.length > 1 && cleanDest.length <= 12) info.destination = cleanDest;
  
      if (fromCity !== cleanDest) info.origin = fromCity;
    } else {
      /* 2. 没有「从 A 到 B」时的兜底 */
      const destMatch = input.match(/(?:(?:去|到|在|玩|旅游|前往)(.+?))(?:[，,\s]|$)/);
      if (destMatch) {
        const raw = destMatch[1].replace(/[，,\s。]+$/, '');
        if (raw.length > 1 && raw.length <= 12) info.destination = raw;
      }
      
      /* 2.1 出发地提取 - 单独处理出发地 */
      // 改进出发地提取逻辑，支持更多表达方式
      const originPatterns = [
        /(?:从|出发地是|在)(.+?)(?:出发|去)/,  // 原有模式：从北京出发
        /出发地[是为]?(.+?)[\s，,。]?$/,      // 新增模式：出发地是北京
        /(?:从|由)(.+?)出发/,                // 新增模式：从北京出发
        /^出发地(.+?)[\s，,。]?$/,           // 新增模式：出发地北京
        /从(.+?)(?:去|到)/                    // 新增模式：从北京去
      ];
      
      for (const pattern of originPatterns) {
        const originMatch = input.match(pattern);
        if (originMatch) {
          const rawOrigin = originMatch[1].trim().replace(/[，,\s。]+$/, '');
          // 验证提取的出发地不是一些常见的动词或通用词
          const invalidOrigins = ['这', '那', '这里', '那里', '这边', '那边'];
          if (rawOrigin.length > 1 && rawOrigin.length <= 12 && !invalidOrigins.includes(rawOrigin)) {
            info.origin = rawOrigin;
            break; // 找到第一个匹配就停止
          }
        }
      }
      
      // 如果以上模式都没匹配，尝试将整个输入作为出发地（简单地点名称）
      if (!info.origin) {
        const trimmedInput = input.trim().replace(/[，,\s。]+$/, '');
        const invalidOrigins = ['这', '那', '这里', '那里', '这边', '那边', '出发地', '你好', '您好'];
        if (trimmedInput.length > 1 && trimmedInput.length <= 12 && !invalidOrigins.includes(trimmedInput)) {
          // 额外检查，确保输入不是完整句子
          if (!/[？?！!]/.test(trimmedInput) && trimmedInput.split(/\s+/).length <= 3) {
            info.origin = trimmedInput;
          }
        }
      }
      
      /* 3. 天数 - 阿拉伯 & 中文 */
      const arabicDays = input.match(/(\d{1,2})[天日]/);
      if (arabicDays) { info.days = arabicDays[1]; }
      else {
        const cnMap = {一:1,二:2,两:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9,十:10,十一:11,十二:12,十三:13,十四:14,十五:15,十六:16,十七:17,十八:18,十九:19,二十:20};
        for (const [cn, num] of Object.entries(cnMap)) {
          if (new RegExp(cn + '[天日]').test(input)) { info.days = String(num); break; }
        }
      }
      /* 4. 预算 - 统一用 parseBudget */
      const budget = parseBudget(input);
      if (budget) info.budget = String(budget);
      
      /* 5. 人数 */
      const peopleMatch = input.match(/(\d{1,2})[人个]|(?:我们|一共|总共)(\d{1,2})[人个]/);
      if (peopleMatch) info.people = peopleMatch[1] || peopleMatch[2];
      else {
        const cnPeopleMap = {一:1,二:2,两:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9,十:10};
        for (const [cn, num] of Object.entries(cnPeopleMap)) {
          if (new RegExp('(我们|一共|总共)?' + cn + '[人个]').test(input)) { 
            info.people = String(num); 
            break; 
          }
        }
      }
    }
  
    return info;
  }

  const processWithLLM = async (userInput) => {
    if (planningLock) return;
    setPlanningLock(true);
  
    // 2.1 增量提取 & 非空合并
    const newInfo = extractInfoFromInput(userInput);
    
    // 更新旅行信息，保留之前已收集到的信息
    travelInfoRef.current = {
      origin: newInfo.origin || travelInfoRef.current.origin,
      destination: newInfo.destination || travelInfoRef.current.destination,
      days: newInfo.days || travelInfoRef.current.days,
      budget: newInfo.budget || travelInfoRef.current.budget,
      people: newInfo.people || travelInfoRef.current.people,
    };
  
    // 2.2 缺失字段检测
    const missing = [];
    if (!travelInfoRef.current.origin) missing.push('出发地');
    if (!travelInfoRef.current.destination) missing.push('目的地');
    if (!travelInfoRef.current.days) missing.push('天数');
    if (!travelInfoRef.current.budget) missing.push('预算');
    if (!travelInfoRef.current.people) missing.push('人数');

    if (missing.length) {
      // 自然语言追问
      let tip = '';
      if (missing.length === 5) {
        tip = '嗨！很高兴为您规划旅行～能告诉我您从哪里出发、想去哪里、计划玩几天、预算大概是多少，还有几个人一起出行吗？';
      } else {
        const missingParts = [];
        if (!travelInfoRef.current.origin) {
          missingParts.push("您的出发地是哪里");
        }
        if (!travelInfoRef.current.destination) {
          missingParts.push("您想去哪里呢");
        }
        if (!travelInfoRef.current.days) {
          missingParts.push("计划玩几天");
        }
        if (!travelInfoRef.current.budget) {
          missingParts.push("预算大概是多少");
        }
        if (!travelInfoRef.current.people) {
          missingParts.push("有几个人一起出行");
        }
        tip = `我需要${missingParts.join("、")}的信息来为您制定完美的旅行计划呢～`;
      }
      setMessages(prev => [...prev, { id: Date.now(), sender: 'ai', text: tip }]);
      setIsProcessing(false);
      setPlanningLock(false);
      return;
    }
  
    /* ——— 以下与原版相同：四项齐全 → 调模型 / 模拟 ——— */
    const savedSettings = localStorage.getItem('travelPlannerSettings');
    let llmConfig = {};
    if (savedSettings) try { llmConfig = JSON.parse(savedSettings); } catch {}
    
    // 显示正在制定计划的消息（仅显示一次）
    setMessages(prev => [...prev, {
      id: Date.now(),
      sender: 'ai',
      text: '好的，我已了解您的需求，正在制定计划，请稍候。'
    }]);
  
    const history = messages.slice(-6).map(m => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.text
    }));
    
    // 构建用户输入内容，包含出发地信息（如果有的话）
    let userInputContent = `去${travelInfoRef.current.destination}，${travelInfoRef.current.days}天，预算${travelInfoRef.current.budget}元，${travelInfoRef.current.people}人`;
    if (travelInfoRef.current.origin) {
      userInputContent = `从${travelInfoRef.current.origin}到${travelInfoRef.current.destination}，${travelInfoRef.current.days}天，预算${travelInfoRef.current.budget}元，${travelInfoRef.current.people}人`;
    }
    
    const budgetReminder = `（请把每日花费累加，总花费必须≥${travelInfoRef.current.budget * 0.8}且≤${travelInfoRef.current.budget}，否则请调整酒店/餐饮档次，万不得已才超并在JSON前说明原因）`;
    history.push({
      role: 'user',
      content: userInputContent + budgetReminder
    });
  
    if (!llmConfig.llmApiKey) {
      // 如果没有配置API Key，显示提示信息
      setMessages(prev => [...prev, { 
        id: Date.now(), 
        sender: 'ai', 
        text: '抱歉，您尚未配置通义千问API Key，无法生成旅行计划。请前往设置页面配置API Key。' 
      }]);
      setIsProcessing(false);
      setPlanningLock(false);
      // 规划完成后清空记忆（防止下一轮污染）
      travelInfoRef.current = { origin: null, destination: null, days: null, budget: null };
      return;
    }
  
    try {
      const res = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
        method : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization   : `Bearer ${llmConfig.llmApiKey}`
        },
        body: JSON.stringify({
          model      : 'qwen-turbo',
          temperature: 0.7,
          messages   : [{ role: 'system', content: travelPlannerSystemPrompt }, ...history]
        })
      });
      if (!res.ok) throw new Error('模型调用失败');
      const data = await res.json();
      processAIResponse(data.choices[0].message.content);
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { 
        id: Date.now(), 
        sender: 'ai', 
        text: '抱歉，生成旅行计划时出现了错误。请检查您的网络连接或API Key配置。' 
      }]);
      setIsProcessing(false);
      // 出错时清空信息，防止下一轮污染
      travelInfoRef.current = { origin: null, destination: null, days: null, budget: null, people: null };
    } finally {
      setPlanningLock(false);
    }
  };
  

  // 调用通义千问API（用户自己填 Key，不再用 env）
  const callQwenAPI = async (config, userInput) => {
    // 没有 Key 直接抛错，走降级
    if (!config.llmApiKey) throw new Error('未配置 API Key');
  
    const res = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.llmApiKey}`,
      },
      body: JSON.stringify({
        model: 'qwen-turbo',
        temperature: 0.7,
        messages: [
          { role: 'system', content: travelPlannerSystemPrompt },
          { role: 'user', content: userInput },
        ],
      }),
    });
  
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `通义千问错误 ${res.status}`);
    }
  
    const data = await res.json();
    return data.choices[0].message.content; // 可能闲聊，也可能一行 JSON
  };

  // 处理AI响应
  const processAIResponse = (responseText) => {
    const jsonData = extractJSON(responseText);
    if (!jsonData) {
      setMessages(prev => [...prev, { id: Date.now(), sender: 'ai', text: responseText }]);
      setIsProcessing(false);
      return;
    }
  
    /* =====  预算校准开始  ===== */
    const userBudget = parseInt(travelInfoRef.current.budget, 10) || 3500;
    const days       = parseInt(travelInfoRef.current.days, 10)       || 6;
    // 总花费随机落在 80%–105%
    const totalCost = Math.round(userBudget * (0.8 + Math.random() * 0.25));
  
    // 大交通（往返出发地⇋目的地）单独拎出来，占 18% ± 3%
    const bigTraffic = Math.round(totalCost * (0.15 + Math.random() * 0.06));
    const pool       = totalCost - bigTraffic;      // 剩余给 daily
  
    // 每天基础额度：设x为预算/天数
    const x = Math.round(pool / days);
    
    // 每天分配的预算
    const dailyPool = Array.from({ length: days }, (_, i) => {
      const isFirst = i === 0;
      const isLast  = i === days - 1;
      
      // 第一天分配 x * 0.8
      if (isFirst) return Math.round(x * 0.8);
      
      // 最后一天分配 x（后续会特殊处理）
      if (isLast) return x;
      
      // 中间天数分配 x
      return x;
    });
    
    // 调整总预算确保等于 pool
    const currentTotal = dailyPool.reduce((a, b) => a + b, 0);
    if (currentTotal !== pool) {
      // 将差值分配给第一天
      dailyPool[0] += pool - currentTotal;
    }
  
    // 生成 dailyPlan
    const fixedDaily = (jsonData.dailyPlan || []).map((item, i) => {
      const isLast = i === days - 1;
      let money = dailyPool[i];
    
      // 添加随机因子，使每天费用不完全相同，但差距不会过大
      const randomFactor = 0.9 + Math.random() * 0.2; // 0.9到1.1之间的随机数
      money = Math.round(money * randomFactor);
    
      // 动态平衡：按比例分配各项预算
      // 住宿费用：除了最后一天每天都必须有住宿费用
      let zhu = 0;
      if (!isLast) {
        // 住宿费用占总预算的25%-35%
        const accommodationPercentage = 0.25 + Math.random() * 0.1;
        zhu = Math.max(0, Math.round(money * accommodationPercentage));
      }
        
      // 餐饮费用占总预算的20%-30%
      const diningPercentage = 0.2 + Math.random() * 0.1;
        let can = Math.max(0, Math.round(money * diningPercentage));
        
      // 市内交通费用占总预算的10%-20%
      const transportPercentage = 0.1 + Math.random() * 0.1;
        let jiao = Math.max(0, Math.round(money * transportPercentage));
        
      // 门票费用（最后一天无门票）
      let men = 0;
      if (!isLast) {
        // 门票费用占总预算的10%-15%
        const ticketPercentage = 0.1 + Math.random() * 0.05;
        men = Math.max(0, Math.round(money * ticketPercentage));
      }
        
      // 购物费用占总预算的5%-15%
      const shoppingPercentage = 0.05 + Math.random() * 0.1;
        let shopping = Math.max(0, Math.round(money * shoppingPercentage));
        
      // 娱乐费用占总预算的5%-10%
      const entertainmentPercentage = 0.05 + Math.random() * 0.05;
        let entertainment = Math.max(0, Math.round(money * entertainmentPercentage));
        
      // 将原本分配给"其他"的预算重新分配到现有类别
      const totalAllocated = zhu + can + jiao + men + shopping + entertainment;
      const remaining = Math.max(0, money - totalAllocated);
        
      // 按比例将剩余预算分配到各项支出中
      if (remaining > 0) {
        const totalWeights = (zhu > 0 ? 1 : 0) + 1 + 1 + (men > 0 ? 1 : 0) + 1 + 1;
        if (totalWeights > 0) {
          if (zhu > 0) zhu += Math.round(remaining * (zhu > 0 ? 1 : 0) / totalWeights);
          can += Math.round(remaining * 1 / totalWeights);
          jiao += Math.round(remaining * 1 / totalWeights);
          if (men > 0) men += Math.round(remaining * (men > 0 ? 1 : 0) / totalWeights);
          shopping += Math.round(remaining * 1 / totalWeights);
          entertainment += Math.round(remaining * 1 / totalWeights);
        }
      }
    
      return {
        description: typeof item === 'string' ? item : (item.description || `第${i + 1}天行程`),
        budget: `住宿: ¥${zhu}, 餐饮: ¥${can}, 交通: ¥${jiao}${men > 0 ? `, 门票: ¥${men}` : ''}${shopping > 0 ? `, 购物: ¥${shopping}` : ''}${entertainment > 0 ? `, 娱乐: ¥${entertainment}` : ''}`
      };
    });
    
    // 特殊处理最后一天的预算：将其餐饮、交通、购物、娱乐设置为第一天的50%
    if (fixedDaily.length > 1) {
      const lastDayIndex = fixedDaily.length - 1;
      
      // 解析第一天的各项费用
      const firstDayBudget = fixedDaily[0].budget;
      const firstDayCan = parseInt(firstDayBudget.match(/餐饮: ¥(\d+)/)?.[1] || 0);
      const firstDayJiao = parseInt(firstDayBudget.match(/交通: ¥(\d+)/)?.[1] || 0);
      const firstDayShopping = parseInt(firstDayBudget.match(/购物: ¥(\d+)/)?.[1] || 0);
      const firstDayEntertainment = parseInt(firstDayBudget.match(/娱乐: ¥(\d+)/)?.[1] || 0);
      
      // 最后一天的费用设置为第一天的50%
      const can = Math.max(0, Math.round(firstDayCan * 0.5));
      const jiao = Math.max(0, Math.round(firstDayJiao * 0.5));
      const shopping = Math.max(0, Math.round(firstDayShopping * 0.5));
      const entertainment = Math.max(0, Math.round(firstDayEntertainment * 0.5));
      const zhu = 0; // 最后一天住宿费用为0
      const men = 0; // 最后一天门票费用为0
      
      // 更新最后一天的预算
      fixedDaily[lastDayIndex].budget = `住宿: ¥${zhu}, 餐饮: ¥${can}, 交通: ¥${jiao}, 门票: ¥${men}, 购物: ¥${shopping}, 娱乐: ¥${entertainment}`;
    }
    
    // 把「大交通」写进首尾天的 budget 字符串，方便 UI 展示
    if (fixedDaily[0]) {
      fixedDaily[0].budget += `, 往返大交通: ¥${bigTraffic}`;
    }
    
    /* =====  预算校准结束  ===== */
  
    // 统一友好结束语
    setMessages(prev => [...prev, {
      id: Date.now() + 2,
      sender: 'ai',
      text: '已完成规划！以下是为您定制的旅行方案。',
    }]);
  
    // 右侧地图 & 卡片数据
    const planData = {
      origin: travelInfoRef.current.origin, // 添加出发地信息
      destination: jsonData.destination,
      duration: jsonData.duration,
      startDate: jsonData.startDate,
      budget: `¥${userBudget}/${travelInfoRef.current.people}人`,
      highlights: jsonData.highlights || [],
      routePoints: jsonData.routePoints || [],
      dailyPlan: fixedDaily
    };
    
    setTravelPlan(planData);
    
    // 步骤条动画
    setCurrentStep(3);
    setTimeout(() => {
      setCurrentStep(4);
      setIsProcessing(false);
    }, 1500);
  };

  // 保存计划到数据库
  const savePlanToDatabase = async (planData) => {
    if (!user) return;

    try {
      // 保存到Supabase数据库
      const result = await saveTravelPlan(user.id, planData);
      
      if (result.success) {
        console.log('计划已保存到数据库');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('保存计划失败:', error);
      message.error('保存旅行计划失败: ' + error.message);
    }
  };

  // 手动保存计划的函数
  const handleSavePlan = () => {
    if (!travelPlan) {
      message.warning('当前没有可保存的旅行计划');
      return;
    }
    
    Modal.confirm({
      title: '保存旅行计划',
      content: '是否要保存这个旅行计划到您的个人收藏中？',
      okText: '保存',
      cancelText: '取消',
      onOk: () => {
        savePlanToDatabase(travelPlan);
        message.success('旅行计划已保存！');
      }
    });
  };

  const steps = [
    {
      title: '需求分析',
      description: '分析旅行需求',
    },
    {
      title: '地点筛选',
      description: '搜索最佳目的地',
    },
    {
      title: '行程规划',
      description: '制定详细行程',
    },
    {
      title: '完成',
      description: '输出完整方案',
    },
  ];

  // 旅行计划基本信息数据
  const planInfoData = travelPlan ? [
    { icon: <EnvironmentOutlined />, title: '目的地', value: travelPlan.destination },
    { icon: <ClockCircleOutlined />, title: '行程时长', value: travelPlan.duration },
    { icon: <CalendarOutlined />, title: '出发日期', value: travelPlan.startDate },
    { icon: <DollarCircleOutlined />, title: '预算', value: travelPlan.budget },
    { icon: <DollarCircleOutlined />, title: '总花费', value: calculateTotalBudget(travelPlan.dailyPlan) }
  ] : [];

  // 动态加载高德地图API
  const loadAMapAPI = () => {
    // 从localStorage获取设置
    const savedSettings = localStorage.getItem('travelPlannerSettings');
    let amapApiKey = '';
    
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        amapApiKey = settings.amapApiKey || '';
      } catch (e) {
        console.error('解析设置时出错:', e);
      }
    }
    
    // 如果没有API Key，不加载地图
    if (!amapApiKey) {
      console.warn('未配置高德地图API Key');
      return Promise.resolve();
    }
    
    // 如果脚本已经加载，直接返回
    if (window.AMap) {
      return Promise.resolve();
    }
    
    // 如果正在加载，返回一个空的Promise
    if (amapScriptLoaded.current) {
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (window.AMap) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      });
    }
    
    // 标记为正在加载
    amapScriptLoaded.current = true;
    
    // 动态创建脚本标签，同时加载核心API和常用插件
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.type = 'text/javascript';
      // 添加plugin参数以加载常用插件
      script.src = `https://webapi.amap.com/maps?v=1.4.15&key=${amapApiKey}&plugin=AMap.Geocoder`;
      script.onload = () => resolve();
      script.onerror = () => {
        amapScriptLoaded.current = false;
        reject(new Error('高德地图API加载失败'));
      };
      document.head.appendChild(script);
    });
  };

  // 初始化地图
  useEffect(() => {
    // 加载高德地图API
    loadAMapAPI().then(() => {
      // 确保高德地图API已加载且地图容器存在
      if (window.AMap && !mapInstance.current && mapRef.current) {
        mapInstance.current = new window.AMap.Map(mapRef.current, {
          zoom: 11,
          center: [118.796773, 32.063106], // 南京大学鼓楼校区坐标
          mapStyle: 'amap://styles/normal'
        });
        
        // 添加地图加载完成事件
        mapInstance.current.on('complete', () => {
          console.log('地图加载完成');
        });
      }
    }).catch((error) => {
      console.error('加载高德地图API时出错:', error);
      message.error('地图加载失败: ' + error.message);
    });
    
    // 组件卸载时清理地图实例
    return () => {
      if (mapInstance.current) {
        mapInstance.current.destroy();
        mapInstance.current = null;
      }
      amapScriptLoaded.current = false;
    };
  }, []);

  // 当旅行计划更新时，在地图上显示相关信息
  useEffect(() => {
    if (!travelPlan || !mapInstance.current || !window.AMap) return;
  
    // 清除地图上所有已有的覆盖物
    mapInstance.current.clearMap();
    
    // 获取用户输入的出发地信息
    const origin = travelInfoRef.current.origin;
    
    // 构建完整的路线点列表（包含起点和终点）
    const routePoints = [];
    
    // 添加起点（出发地）
    if (origin) {
      // 如果有第一个路径点，使用其坐标作为出发地坐标
      const firstPoint = travelPlan.routePoints?.[0];
      if (firstPoint) {
        routePoints.push({
          name: origin,
          lat: firstPoint.lat,
          lng: firstPoint.lng,
          type: 'origin',
          label: origin
        });
      } else {
        // 如果没有路径点，使用默认坐标
        routePoints.push({
          name: origin,
          lat: 39.90923,  // 北京坐标
          lng: 116.397428,
          type: 'origin',
          label: origin
        });
      }
    }
    
    // 添加游玩路线点
    if (travelPlan.routePoints && travelPlan.routePoints.length > 0) {
      travelPlan.routePoints.forEach((point, index) => {
        routePoints.push({
          ...point,
          type: 'attraction',
          label: `${routePoints.length}. ${point.name}`,
          index: routePoints.length
        });
      });
    }
    
    // 添加终点（回到出发地）
    if (origin && travelPlan.routePoints?.length > 0) {
      // 使用最后一个路径点的坐标作为返回出发地的坐标
      const lastPoint = travelPlan.routePoints[travelPlan.routePoints.length - 1];
      routePoints.push({
        name: origin,
        lat: lastPoint.lat,
        lng: lastPoint.lng,
        type: 'origin',
        label: origin
      });
    }
    
    // 过滤掉无效坐标点
    const validPoints = routePoints.filter(point => 
      point && 
      typeof point.lat === 'number' && 
      typeof point.lng === 'number' &&
      point.lat >= -90 && point.lat <= 90 &&
      point.lng >= -180 && point.lng <= 180
    );
    
    // 如果没有有效点，则直接返回
    if (validPoints.length === 0) return;
    
    // 创建地图标记和信息窗口
    const markers = [];
    const infoWindows = [];
    
    // 为每个有效点创建标记和信息窗口
    validPoints.forEach((point, index) => {
      // 创建标记
      const marker = new window.AMap.Marker({
        position: [point.lng, point.lat],
        title: point.label
      });
      
      // 设置标记标签（根据类型使用不同颜色）
      let labelContent = '';
      if (point.type === 'origin') {
        // 不为出发地点添加标签（删除紫色框）
        labelContent = '';
      } else {
        labelContent = `
          <div style="
            background-color: #1890ff; 
            color: white; 
            border-radius: 16px; 
            padding: 6px 12px; 
            font-size: 14px; 
            text-align: center; 
            white-space: nowrap;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            font-weight: bold;
            border: none;
          ">
            ${point.label}
          </div>
        `;
      }
      
      // 仅对非出发地点设置标签
      if (labelContent) {
        marker.setLabel({
          content: labelContent,
          offset: new window.AMap.Pixel(-10, 10)
        });
      }
      
      // 创建信息窗口
      const infoWindow = new window.AMap.InfoWindow({
        content: `<div style="padding: 8px; font-weight: bold;">${point.label}</div>`,
        offset: new window.AMap.Pixel(0, -30),
        borderWidth: 0,
        borderColor: '#1890ff'
      });
      
      // 将标记和信息窗口添加到数组中
      markers.push(marker);
      infoWindows.push(infoWindow);
      
      // 添加点击事件
      marker.on('click', () => {
        infoWindow.open(mapInstance.current, [point.lng, point.lat]);
      });
      
      // 将标记添加到地图
      marker.setMap(mapInstance.current);
    });
    
    // 创建路径线（用直线连接所有点）
    if (validPoints.length > 1) {
      const path = validPoints.map(point => [point.lng, point.lat]);
      const polyline = new window.AMap.Polyline({
        path: path,
        strokeColor: "#1890ff",
        strokeWeight: 6,
        strokeOpacity: 0.8,
        isOutline: true,
        outlineColor: '#ffffff',
        borderWeight: 2
      });
      
      // 添加路径线到地图
      polyline.setMap(mapInstance.current);
    }
    
    // 设置地图视野包含所有路径点
    if (markers.length > 0) {
      mapInstance.current.setFitView(markers);
    }
    
    // 自动打开第一个点的信息窗口
    if (markers.length > 0 && infoWindows.length > 0) {
      setTimeout(() => {
        infoWindows[0].open(mapInstance.current, markers[0].getPosition());
      }, 500);
    }
  }, [travelPlan]);

  return (
    <Layout style={{ 
      minHeight: '100vh',
      background: '#fff'
    }}>
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
            <Avatar size="large" icon={<RobotOutlined />} style={{ backgroundColor: '#764ba2' }} />
            <Title level={3} style={{ 
              color: 'white', 
              margin: '0 0 0 12px',
              fontWeight: 'bold'
            }}>
              智能旅行规划系统
            </Title>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Button 
              type="link" 
              onClick={() => navigate('/user-home')}
              style={{ color: 'white', marginRight: 16 }}
            >
              我的计划
            </Button>
            <Button 
              type="link" 
              onClick={() => navigate('/settings')}
              style={{ color: 'white', marginRight: 16 }}
            >
              设置
            </Button>
            {travelPlan && (
              <Button 
                type="link" 
                onClick={handleSavePlan}
                style={{ color: 'white', marginRight: 16 }}
                icon={<SaveOutlined />}
              >
                保存计划
              </Button>
            )}
            <Text style={{ color: 'white', marginRight: 16 }}>欢迎, {user?.email}</Text>
            <Button 
              type="text" 
              icon={<LogoutOutlined />} 
              onClick={signOut}
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
        minHeight: 'calc(100vh - 64px - 69px)'
      }}>
        <Row gutter={24} style={{ minHeight: 'calc(100vh - 64px - 48px - 69px)' }}>
          {/* 左侧内容区域 */}
          <Col span={12}>
            <div style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column' }}>
              {/* 对话区域 */}
              <div style={{ padding: '0 0 24px 0', borderBottom: '1px solid #f0f0f0' }}>
                <Title level={4} style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  gap: 8
                }}>
                  <RobotOutlined />
                  AI旅行助手
                </Title>
                
                {/* 检查AI配置提示 */}
                {!isProcessing && messages.length === 1 && (() => {
                  const savedSettings = localStorage.getItem('travelPlannerSettings');
                  let llmConfig = {};
                  
                  if (savedSettings) {
                    try {
                      llmConfig = JSON.parse(savedSettings);
                    } catch (e) {
                      console.error('解析设置时出错:', e);
                    }
                  }
                  
                  if (!llmConfig.llmApiKey) {
                    return (
                      <div style={{ 
                        backgroundColor: '#fffbe6', 
                        border: '1px solid #ffe58f', 
                        borderRadius: 4, 
                        padding: '12px 16px', 
                        marginBottom: 16 
                      }}>
                        <Text>
                          <span style={{ color: '#faad14', fontWeight: 'bold' }}>提示：</span>
                          检测到您尚未配置通义千问API Key，当前使用模拟数据。请前往
                          <Button 
                            type="link" 
                            onClick={() => navigate('/settings')} 
                            style={{ padding: 0, height: 'auto' }}
                          >
                            设置页面
                          </Button>
                          配置通义千问服务以获得更好的体验。
                        </Text>
                      </div>
                    );
                  }
                  return null;
                })()}
                
                <div style={{ 
                  height: '60vh', 
                  minHeight: '500px',
                  maxHeight: '700px',
                  overflowY: 'auto', 
                  marginBottom: '20px',
                  background: '#fafafa',
                  borderRadius: 6,
                  padding: '16px',
                  border: '1px solid #f0f0f0'
                }}>
                  <List
                    dataSource={messages}
                    renderItem={message => (
                      <List.Item style={{ border: 'none', padding: '8px 0' }}>
                        <div style={{
                          display: 'flex',
                          flexDirection: message.sender === 'user' ? 'row-reverse' : 'row',
                          width: '100%'
                        }}>
                          <Avatar 
                            style={{ 
                              backgroundColor: message.sender === 'user' ? '#1890ff' : '#764ba2',
                              flexShrink: 0
                            }} 
                            icon={message.sender === 'user' ? <UserOutlined /> : <RobotOutlined />}
                          />
                          <div style={{
                            maxWidth: '80%',
                            marginLeft: message.sender === 'user' ? 0 : '12px',
                            marginRight: message.sender === 'user' ? '12px' : 0
                          }}>
                            <div style={{
                              padding: '12px 16px',
                              borderRadius: '18px',
                              background: message.sender === 'user' ? '#1890ff' : '#f0f0f0',
                              color: message.sender === 'user' ? '#fff' : '#000',
                              marginLeft: message.sender === 'user' ? 'auto' : 0
                            }}>
                              <Text>{message.text}</Text>
                            </div>
                          </div>
                        </div>
                      </List.Item>
                    )}
                  />
                </div>
                
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  <TextArea
                    rows={4}
                    placeholder="描述您的旅行需求，如：我和家人想去一个风景优美的地方度假，预算5000元，时间5天..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onPressEnter={handleSend}
                    disabled={isProcessing}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Steps 
                      current={currentStep} 
                      items={steps.map(item => ({ ...item, key: item.title }))}
                      size="small"
                      style={{ flex: 1, marginRight: 16 }}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button 
                        type="default" 
                        icon={<AudioOutlined />} 
                        onClick={handleVoiceInput}
                        size="large"
                        disabled={isProcessing}
                      />
                      <Button 
                        type="primary" 
                        icon={<SendOutlined />} 
                        onClick={handleSend}
                        size="large"
                        loading={isProcessing}
                      >
                        发送
                      </Button>
                    </div>
                  </div>
                </Space>
              </div>
              
              {/* 旅行规划结果 - 基本信息 */}
              <div style={{ padding: '24px 0 0 0', flex: 1, overflow: 'auto' }}>
                <Title level={4} style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 24
                }}>
                  <CheckCircleOutlined />
                  旅行规划结果 - 基本信息
                </Title>
                
                {travelPlan ? (
                  <Card title="基本信息">
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
                    
                    <Divider orientation="left">亮点推荐</Divider>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {travelPlan.highlights.map((highlight, index) => (
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
                    
                    <div style={{ marginTop: 24, textAlign: 'center' }}>
                      <Button 
                        type="primary" 
                        icon={<SaveOutlined />}
                        onClick={() => {
                          savePlanToDatabase(travelPlan);
                          message.success('旅行计划已保存！');
                        }}
                      >
                        保存旅行计划
                      </Button>
                    </div>
                  </Card>
                ) : (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '48px 0',
                    background: '#fafafa',
                    borderRadius: 6,
                    border: '1px dashed #d9d9d9'
                  }}>
                    <Avatar 
                      size={64} 
                      icon={<RobotOutlined />} 
                      style={{ backgroundColor: '#f0f2f5', color: 'rgba(0,0,0,0.45)' }} 
                    />
                    <Title level={4} style={{ marginTop: 16, color: 'rgba(0,0,0,0.45)' }}>
                      等待生成旅行计划
                    </Title>
                    <Text type="secondary">
                      描述您的旅行需求，AI助手将为您生成个性化的旅行方案
                    </Text>
                  </div>
                )}
              </div>
            </div>
          </Col>
          
          {/* 右侧地图和详细行程区域 */}
          <Col span={12}>
            <div style={{ 
              height: '100%', 
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ 
                padding: '24px 24px 0 24px' 
              }}>
                <Title level={4} style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  gap: 8,
                  margin: 0
                }}>
                  <EnvironmentOutlined />
                  地图视图
                </Title>
                <Text type="secondary">旅行路线和景点将在地图上展示</Text>
              </div>
              
              {/* 固定大小的地图区域 - 正方形，高度增加1倍 */}
              <div 
                ref={mapRef}
                style={{ 
                  width: '100%',
                  aspectRatio: '1/1',
                  margin: 24,
                  borderRadius: 8,
                  maxHeight: '800px',
                  position: 'relative'
                }}
              >
                {/* 地图加载提示 */}
                {!window.AMap && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#f5f5f5',
                    borderRadius: 8,
                    zIndex: 1
                  }}>
                    <EnvironmentOutlined style={{ 
                      fontSize: 48, 
                      color: 'rgba(0,0,0,0.25)',
                      marginBottom: 16
                    }} />
                    <Title level={4} style={{ color: 'rgba(0,0,0,0.45)', marginBottom: 8 }}>
                      地图区域
                    </Title>
                    <Text type="secondary">
                      {(() => {
                        const settings = localStorage.getItem('travelPlannerSettings');
                        if (settings) {
                          try {
                            const parsed = JSON.parse(settings);
                            if (parsed.amapApiKey) {
                              return '正在加载地图...';
                            }
                          } catch (e) {
                            // 解析失败
                          }
                        }
                        return '请在设置中配置高德地图API Key';
                      })()}
                    </Text>
                  </div>
                )}
              </div>
              
              {/* 旅行规划结果 - 详细行程 */}
              <div style={{ padding: '0 24px 24px 24px', flex: 1, overflow: 'auto' }}>
                <Title level={4} style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 24
                }}>
                  <CheckCircleOutlined />
                  详细行程
                </Title>
                
                {travelPlan ? (
                  <Card title="详细行程" extra={
                    <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                      总花费: {calculateTotalBudget(travelPlan.dailyPlan)}
                    </div>
                  }>
                    <List
                      itemLayout="vertical"
                      dataSource={travelPlan.dailyPlan}
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
                                  {typeof item === 'string' ? item : item.description}
                                </Paragraph>
                                {item.budget && (
                                  <Paragraph style={{ 
                                    fontSize: '14px', 
                                    marginBottom: 0,
                                    padding: '8px 12px',
                                    backgroundColor: '#f6ffed',
                                    border: '1px solid #b7eb8f',
                                    borderRadius: 4
                                  }}>
                                    <strong>预算:</strong> {item.budget}
                                  </Paragraph>
                                )}
                              </div>
                            }
                          />
                        </List.Item>
                      )}
                    />
                  </Card>
                ) : (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '48px 0',
                    background: '#fafafa',
                    borderRadius: 6,
                    border: '1px dashed #d9d9d9'
                  }}>
                    <Avatar 
                      size={64} 
                      icon={<RobotOutlined />} 
                      style={{ backgroundColor: '#f0f2f5', color: 'rgba(0,0,0,0.45)' }} 
                    />
                    <Title level={4} style={{ marginTop: 16, color: 'rgba(0,0,0,0.45)' }}>
                      等待生成详细行程
                    </Title>
                    <Text type="secondary">
                      描述您的旅行需求，AI助手将为您生成详细的旅行行程
                    </Text>
                  </div>
                )}
              </div>
            </div>
          </Col>
        </Row>
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
}

export default App;    
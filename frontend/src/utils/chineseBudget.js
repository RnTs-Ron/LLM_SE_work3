// 中文数字 → 阿拉伯数字（支持小数、万/千/百）
export function chinese2num(str) {
  const cn = '零一二两三四五六七八九';
  const unit = { 十: 10, 百: 100, 千: 1000, 万: 10000 };
  let num = 0;
  let section = 0;
  let temp = 0;

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    const idx = cn.indexOf(ch);
    if (idx >= 0) temp = idx;               // 数字
    else if (unit[ch]) {
      temp = temp || 1;                     // “十”开头时当作 1
      section += temp * unit[ch];
      temp = 0;
      if (ch === '万') { num += section * 10000; section = 0; }
    }
  }
  return num + section + temp;
}

// 把"5千""5万""1.5万""五千""一万二千""12000""2万2千"全部转成整数（元）
export function parseBudget(text) {
  if (!text) return null;
  text = text.trim();

  // 1. 优先拿 4 位及以上的纯阿拉伯数字（1000~999999）
  const m3 = text.match(/\d{4,}/g);
  if (m3 && m3.length) {
    return Math.max(...m3.map(n => parseInt(n, 10)));
  }

  // 2. 处理复合表达式，如"2万2千"
  const compoundMatch = text.match(/(\d+(?:\.\d+)?)\s*万\s*(\d+(?:\.\d+)?)\s*千/);
  if (compoundMatch) {
    const [, wan, qian] = compoundMatch;
    const val = Math.round(parseFloat(wan) * 10000 + parseFloat(qian) * 1000);
    return val;
  }

  // 3. 再拿 "1.2万 / 5千 / 2万" 这种带中文单位的（≥1 位数字）
  const unit = { 万: 10000, 千: 1000, 百: 100 };
  const m1 = text.match(/(\d+(?:\.\d+)?)\s*([万千百])/g);
  if (m1) {
    let maxVal = 0;
    m1.forEach(s => {
      const match = s.match(/(\d+(?:\.\d+)?)\s*([万千百])/);
      if (match) {
        const [, n, u] = match;
        const val = Math.round(parseFloat(n) * unit[u]);
        if (val > maxVal) maxVal = val;
      }
    });
    if (maxVal > 0) return maxVal;
  }

  // 4. 纯中文数字（五千 / 一万二千）
  const m2 = text.match(/[零一二两三四五六七八九十百千]+万?[零一二两三四五六七八九十百千]*/);
  if (m2) {
    const result = chinese2num(m2[0]);
    if (result > 0) return result;
  }

  return null;
}

// 从用户输入中提取旅行信息
export function extractInfoFromInput(input) {
  // 检查是否是重新开始的指令
  const restartPatterns = [
    /不好[，,]?\s*换一个/,
    /换一个[，,]?\s*不好/,
    /重新开始/,
    /换一个/,
    /重新来/,
    /再来一次/,
    /不好/,
    /换方案/,
    /换个方案/,
    /重新规划/
  ];
  
  // 如果匹配到重新开始的指令，清空当前计划和行程信息
  for (const pattern of restartPatterns) {
    if (pattern.test(input)) {
      // 返回空信息对象，触发重新询问
      return {};
    }
  }
  
  const info = {};

  /* 0. 提取偏好信息 */
  const preferences = [];
  
  // 购物相关关键词
  const shoppingKeywords = ['购物', '逛街', '买', '商场', '购物中心', '血拼', '淘宝', '购物街', '商城', 'outlet'];
  for (const keyword of shoppingKeywords) {
    if (input.includes(keyword)) {
      preferences.push('购物');
      break;
    }
  }
  
  // 美食相关关键词
  const foodKeywords = ['吃', '美食', '餐厅', '小吃', '特色菜', '餐馆', '夜宵', '夜市', '品尝', '好吃', '美味'];
  for (const keyword of foodKeywords) {
    if (input.includes(keyword)) {
      preferences.push('美食');
      break;
    }
  }
  
  // 文化相关关键词
  const cultureKeywords = ['文化', '历史', '博物馆', '古迹', '遗址', '传统', '民俗', '古镇', '古建筑', '艺术', '文物'];
  for (const keyword of cultureKeywords) {
    if (input.includes(keyword)) {
      preferences.push('文化');
      break;
    }
  }
  
  // 自然风光相关关键词
  const natureKeywords = ['自然', '风景', '山水', '公园', '湖泊', '山景', '海滩', '森林', '景色', '风光', '拍照'];
  for (const keyword of natureKeywords) {
    if (input.includes(keyword)) {
      preferences.push('自然风光');
      break;
    }
  }
  
  // 娱乐休闲相关关键词
  const entertainmentKeywords = ['娱乐', '休闲', '放松', '度假', 'spa', '按摩', '温泉', '游乐场', '游戏', '玩'];
  for (const keyword of entertainmentKeywords) {
    if (input.includes(keyword)) {
      preferences.push('娱乐休闲');
      break;
    }
  }
  
  // 动漫相关关键词
  const animeKeywords = ['动漫', '二次元', 'cosplay', '漫画', '动画', '手办', '漫展', 'ACG', '宅文化'];
  for (const keyword of animeKeywords) {
    if (input.includes(keyword)) {
      preferences.push('动漫');
      break;
    }
  }
  
  // 运动健身相关关键词
  const sportsKeywords = ['运动', '健身', '跑步', '游泳', '登山', '徒步', '骑行', '滑雪', '潜水', '冲浪', '瑜伽', '马拉松', '体育馆'];
  for (const keyword of sportsKeywords) {
    if (input.includes(keyword)) {
      preferences.push('运动健身');
      break;
    }
  }
  
  // 音乐相关关键词
  const musicKeywords = ['音乐', '演唱会', '音乐会', 'KTV', '乐器', '钢琴', '吉他', '现场', 'livehouse', '音乐节'];
  for (const keyword of musicKeywords) {
    if (input.includes(keyword)) {
      preferences.push('音乐');
      break;
    }
  }
  
  // 艺术相关关键词
  const artKeywords = ['艺术', '画展', '美术馆', '雕塑', '摄影', '画廊', '创意', '设计', '手工艺'];
  for (const keyword of artKeywords) {
    if (input.includes(keyword)) {
      preferences.push('艺术');
      break;
    }
  }
  
  // 建筑相关关键词
  const architectureKeywords = ['建筑', '地标', '高楼', '教堂', '宫殿', '城堡', '特色建筑', '现代建筑'];
  for (const keyword of architectureKeywords) {
    if (input.includes(keyword)) {
      preferences.push('建筑');
      break;
    }
  }
  
  // 户外探险相关关键词
  const outdoorKeywords = ['户外', '探险', '露营', '野餐', '徒步', '攀岩', '漂流', '越野', '野外'];
  for (const keyword of outdoorKeywords) {
    if (input.includes(keyword)) {
      preferences.push('户外探险');
      break;
    }
  }
  
  // 亲子家庭相关关键词
  const familyKeywords = ['亲子', '家庭', '孩子', '儿童', '幼儿园', '小学生', '游乐场', '亲子游', '带娃'];
  for (const keyword of familyKeywords) {
    if (input.includes(keyword)) {
      preferences.push('亲子家庭');
      break;
    }
  }
  
  // 商务出差相关关键词
  const businessKeywords = ['商务', '出差', '会议', '商务舱', '谈判', '展会', '工作', '办公'];
  for (const keyword of businessKeywords) {
    if (input.includes(keyword)) {
      preferences.push('商务出差');
      break;
    }
  }
  
  // 度假休闲相关关键词
  const resortKeywords = ['度假', '海岛', '温泉', '沙滩', '度假村', '休闲', '放松', '慢生活'];
  for (const keyword of resortKeywords) {
    if (input.includes(keyword)) {
      preferences.push('度假休闲');
      break;
    }
  }
  
  // 如果有偏好信息，则添加到info对象中
  if (preferences.length > 0) {
    info.preferences = [...new Set(preferences)]; // 去重
  }

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
      // 添加对"一周"、"两周"等表达的支持
      const weekMatch = input.match(/(一|二|两|三|四|五|六|七|八|九|十|十一|十二|十三|十四|十五|十六|十七|十八|十九|二十)[周週]/);
      if (weekMatch) {
        const cnMap = {
          一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 
          六: 6, 七: 7, 八: 8, 九: 9, 十: 10, 
          十一: 11, 十二: 12, 十三: 13, 十四: 14, 十五: 15,
          十六: 16, 十七: 17, 十八: 18, 十九: 19, 二十: 20
        };
        const weekNum = cnMap[weekMatch[1]];
        if (weekNum) {
          info.days = String(weekNum * 7); // 一周=7天
        }
      } else {
        const cnMap = {
          一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 
          六: 6, 七: 7, 八: 8, 九: 9, 十: 10, 
          十一: 11, 十二: 12, 十三: 13, 十四: 14, 十五: 15,
          十六: 16, 十七: 17, 十八: 18, 十九: 19, 二十: 20
        };
        for (const [cn, num] of Object.entries(cnMap)) {
          if (new RegExp(cn + '[天日]').test(input)) { 
            info.days = String(num); 
            break; 
          }
        }
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

// 检查旅行信息是否完整
export function isTravelInfoComplete(info) {
  return info.origin && info.destination && info.days && info.budget && info.people;
}
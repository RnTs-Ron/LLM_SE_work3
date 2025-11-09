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

// 把"5千""5万""1.5万""五千""一万二千""12000"全部转成整数（元）
export function parseBudget(text) {
  if (!text) return null;
  text = text.trim();

  // 1. 优先拿 4 位及以上的纯阿拉伯数字（1000~999999）
  const m3 = text.match(/\d{4,}/g);
  if (m3 && m3.length) {
    return Math.max(...m3.map(n => parseInt(n, 10)));
  }

  // 2. 再拿 “1.2万 / 5千” 这种带中文单位的（≥2 位数字，防止把“6天”里的 6 算进来）
  const unit = { 万: 10000, 千: 1000, 百: 100 };
  const m1 = text.match(/(\d{2,}(?:\.\d+)?)\s*([万千百])/g);
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

  // 3. 纯中文数字（五千 / 一万二千）
  const m2 = text.match(/[零一二两三四五六七八九十百千]+万?[零一二两三四五六七八九十百千]*/);
  if (m2) {
    const result = chinese2num(m2[0]);
    if (result > 0) return result;
  }

  return null;
}
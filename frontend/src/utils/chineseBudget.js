// 中文数字 → 阿拉伯数字（支持小数、万/千/百）
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
  
  // 把“5千”“5万”“1.5万”“五千”“一万二千”“6000”全部转成整数（元）
  export function parseBudget(text) {
    if (!text) return null;
  
    // 1. 阿拉伯+中文单位（5千 / 1.5万）
    const m1 = text.match(/(\d+(?:\.\d+)?)\s*([万千百])/g);
    if (m1) {
      return m1.reduce((sum, s) => {
        const [, n, u] = s.match(/(\d+(?:\.\d+)?)\s*([万千百])/);
        const unit = { 万: 10000, 千: 1000, 百: 100 };
        return sum + Math.round(parseFloat(n) * unit[u]);
      }, 0);
    }
  
    // 2. 纯中文（五千 / 一万二千）
    const m2 = text.match(/[零一二两三四五六七八九十百千]+万?[零一二两三四五六七八九十百千]*/);
    if (m2) return chinese2num(m2[0]);
  
    // 3. 纯数字（6000、3000 等）
    const m3 = text.match(/\d{3,}/);   // 3 位以上数字才认，防止“玩5天”里的 5
    return m3 ? parseInt(m3[0], 10) : null;
  }
/* ===== 随机引擎与格式化工具 ===== */
(function (global) {
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  let _seed = Math.floor(Math.random() * 900000) + 100000;
  let _rnd = mulberry32(_seed);

  const R = {
    seed: function () { return _seed; },
    setSeed: function (s) { _seed = s | 0; _rnd = mulberry32(_seed); },
    next: function () { return _rnd(); },
    /* 浮点区间：[a,b]，fixed 为保留小数位 */
    range: function (a, b, fixed) {
      const v = a + _rnd() * (b - a);
      return fixed === undefined ? v : Number(v.toFixed(fixed));
    },
    int: function (a, b) { return Math.floor(a + _rnd() * (b - a + 1)); },
    pick: function (arr) { return arr[Math.floor(_rnd() * arr.length)]; },
    pickMany: function (arr, n) {
      const pool = arr.slice(), out = [];
      while (n-- > 0 && pool.length) out.push(pool.splice(Math.floor(_rnd() * pool.length), 1)[0]);
      return out;
    },
    shuffle: function (arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(_rnd() * (i + 1));
        const t = a[i]; a[i] = a[j]; a[j] = t;
      }
      return a;
    },
    /* 每 ~35% 概率返回 true，用于制造干扰信号 */
    maybe: function (p) { return _rnd() < (p === undefined ? 0.35 : p); }
  };

  const F = {
    money: function (v, d) {
      d = d === undefined ? 2 : d;
      const s = Number(v).toFixed(d);
      const parts = s.split('.');
      const i = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      return '$' + i + (parts[1] ? '.' + parts[1] : '');
    },
    pct: function (v, d) {
      d = d === undefined ? 2 : d;
      return Number(v).toFixed(d) + '%';
    },
    num: function (v, d) {
      d = d === undefined ? 0 : d;
      return Number(v).toFixed(d);
    },
    comma: function (v) {
      return Number(v).toLocaleString('en-US');
    },
    /* 把用户输入解析成数字，容忍 $ % , 空格 */
    parseNum: function (str) {
      if (typeof str === 'number') return str;
      if (!str) return NaN;
      const cleaned = String(str).replace(/[\s,$，%]/g, '').replace(/[^\d.\-]/g, '');
      if (cleaned === '' || cleaned === '-' || cleaned === '.') return NaN;
      return parseFloat(cleaned);
    },
    /* 容差判分：相对 2.5% 或绝对 0.02 取宽松者；% 单位兼容 0.205 这种小数写法 */
    closeTo: function (user, ans, unit) {
      if (!isFinite(user)) return false;
      const cands = [user];
      if (unit === '%') cands.push(user * 100);
      return cands.some(function (u) {
        const diff = Math.abs(u - ans);
        const rel = Math.abs(ans) > 1e-9 ? diff / Math.abs(ans) : diff;
        return rel <= 0.025 || diff <= 0.02;
      });
    }
  };

  global.R = R;
  global.F = F;
})(window);

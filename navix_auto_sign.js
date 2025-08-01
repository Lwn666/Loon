/**
 * 探花TV 自动签到 + 双 Cookie 捕获
 * 保存为 navix_auto_sign.js
 */

const $ = new Env('探花TV');
const SIGN_URL = 'https://navix.site/api/sign_in';
const COOKIE_KEY = 'navix_cookie';

/**************** 1. Cookie 捕获 ****************/
if (typeof $request !== 'undefined') {
  const h = $request.headers;
  const rawCookie = (h['Cookie'] || h['cookie'] || '').split('; ')
    .reduce((acc, cur) => {
      const [k, v] = cur.split('=');
      if (k && v) acc[k.trim()] = v.trim();
      return acc;
    }, {});

  // 只保留需要的两个字段
  const loginToken = rawCookie.loginToken;
  const SESSION   = rawCookie.SESSION;

  if (loginToken && SESSION) {
    const cookieStr = `loginToken=${loginToken}; SESSION=${SESSION}`;
    $.setdata(cookieStr, COOKIE_KEY);
    $.msg('探花TV', '✅ Cookie 已保存', cookieStr);
  } else {
    $.msg('探花TV', '⚠️ 缺少 loginToken 或 SESSION', JSON.stringify(rawCookie));
  }
  $done();
  return;
}

/**************** 2. 自动签到 ****************/
!(async () => {
  const cookie = $.getdata(COOKIE_KEY);
  if (!cookie) {
    $.msg('探花TV', '❌ Cookie 不存在', '请先登录一次');
    return;
  }

  const opt = {
    url: SIGN_URL,
    method: 'POST',
    headers: {
      accept: 'application/json, text/javascript, */*; q=0.01',
      'sec-fetch-site': 'same-origin',
      'accept-encoding': 'gzip, deflate, br',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'content-length': '0',
      referer: 'https://navix.site/sign_in?isLoggedIn=true&userIp=119.237.255.149&userCountry=Hong+Kong',
      'accept-language': 'zh-SG,zh-CN;q=0.9,zh-Hans;q=0.8',
      'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
      'x-requested-with': 'XMLHttpRequest',
      origin: 'https://navix.site',
      cookie: cookie
    },
    alpn: 'h2'
  };

  $httpClient.post(opt, (error, response, body) => {
    let title = '探花签到结果';
    let subtitle = '';
    let message = '未知错误';

    if (error) {
      subtitle = '网络错误';
      message = error;
    } else {
      subtitle = `HTTP ${response.status}`;
      try {
        const data = JSON.parse(body);
        message = data.message || (response.status === 200 ? '签到成功' : body);
      } catch (e) {
        message = body;
      }
    }

    $notification.post(title, subtitle, message);
    console.log(`${title} - ${subtitle}: ${message}`);
    $done();
  });
})();

/**************** 迷你 Env ****************/
function Env(t, s) {
  return new (class {
    constructor(t, s) {
      this.name = t;
    }
    getdata(k) {
      return $persistentStore.read(k);
    }
    setdata(v, k) {
      return $persistentStore.write(v, k);
    }
    msg(title, subtitle, body) {
      $notification.post(title, subtitle, body);
    }
  })(t, s);
}

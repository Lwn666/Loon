/**
 * 探花TV 自动签到 & Cookie 捕获
 * Loon 专用（单文件双入口）
 * 保存为 navix_auto_sign.js
 */

const $ = new Env('探花TV');
const SIGN_URL = 'https://navix.site/api/sign-in';
const COOKIE_KEY = 'navix_cookie';

/**************** 1. http-request 环境：捕获 Cookie ****************/
if (typeof $request !== 'undefined') {
  const cookieStr = $request.headers['Cookie'] || $request.headers['cookie'];
  if (cookieStr && cookieStr.includes('loginToken')) {
    $.setdata(cookieStr, COOKIE_KEY);
    $.msg('探花TV', '✅ Cookie 已保存', cookieStr);
  }
  $done();
  return;
}

/**************** 2. cron 环境：自动签到 ****************/
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
      Accept: 'application/json, text/javascript, */*; q=0.01',
      'Accept-Language': 'zh-CN,zh;q=0.9',
      'User-Agent':
        'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
      'X-Requested-With': 'XMLHttpRequest',
      Referer: 'https://navix.site/sign_in',
      Cookie: cookie,
    },
  };

  $httpClient.post(opt, (err, resp, data) => {
    if (err) {
      $.msg('探花TV', '❌ 签到失败', err);
    } else {
      try {
        const obj = JSON.parse(data);
        if (obj.code === 200 || obj.message === 'success') {
          $.msg('探花TV', '✅ 签到成功', obj.message || data);
        } else if (obj.code === 401 || obj.message?.includes('登录')) {
          $.msg('探花TV', '⚠️ Cookie 失效', '请重新登录');
          $.setdata('', COOKIE_KEY);
        } else {
          $.msg('探花TV', '⚠️ 签到异常', data);
        }
      } catch (e) {
        $.msg('探花TV', '❌ 解析失败', data);
      }
    }
    $done();
  });
})();

/**************** Env 迷你封装 ****************/
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

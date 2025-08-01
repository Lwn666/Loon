/**
 * 探花TV - 自动签到脚本 (Loon 专用)
 * * 功能:
 * 1. 自动捕获登录成功后的 Cookie。
 * 2. 每日自动执行签到任务。
 *
 * 使用说明:
 * 1. 将此脚本保存到 Loon 的脚本目录中。
 * 2. 配置两条脚本规则：
 * - 一条用于[获取Cookie]，类型为 http-request，关联主机名 navix.site。
 * - 另一条用于[自动签到]，类型为 cron，设置定时执行。
 *
 * @version 2.0
 * @author 编码助手
 * @date 2025-07-31
 */

// ===================================================================
// ========================= START: 配置区 =========================
// ===================================================================

// 用于通知和日志的脚本名称
const SCRIPT_NAME = '探花TV';

// 目标网站的主机名
const HOSTNAME = 'navix.site';

// 用于在 Loon 中持久化存储 Cookie 的键名
const COOKIE_STORAGE_KEY = 'THTV_Cookie_v2';

// 登录凭证在 Cookie 中的关键字段名 (用于验证是否成功捕获)
const AUTH_TOKEN_NAME = 'loginToken';

// 签到API的URL
const SIGN_IN_API_URL = `https://${HOSTNAME}/api/sign-in`;

// ===================================================================
// ========================== END: 配置区 ==========================
// ===================================================================


// 初始化环境构造器
const $ = new Env(SCRIPT_NAME);

// --- 主逻辑 ---
// 通过检查全局变量 $request 是否存在，来判断当前运行环境。
// 如果 $request 存在，说明当前是 http-request 环境（用于捕获Cookie）。
// 否则，是 cron 定时任务环境（用于执行签到）。

if (typeof $request !== 'undefined') {
  handleCookieCapture();
} else {
  // 使用 IIFE (立即调用函数表达式) 来执行异步的签到任务
  !(async () => {
    await performSignIn();
  })()
  .catch((err) => {
    $.msg(SCRIPT_NAME, '❌ 脚本执行异常', err.toString());
  })
  .finally(() => {
    // 确保脚本执行完毕后通知 Loon
    $done();
  });
}

/**
 * 功能：处理 Cookie 捕获
 * 在 http-request 环境下运行，拦截并保存有效的用户 Cookie
 */
function handleCookieCapture() {
  // 某些应用可能会使用小写的 'cookie' 头
  const cookieHeader = $request.headers['Cookie'] || $request.headers['cookie'];
  
  if (cookieHeader && cookieHeader.includes(AUTH_TOKEN_NAME)) {
    // 成功在请求头中找到了包含登录凭证的 Cookie
    const isSuccess = $.setdata(cookieHeader, COOKIE_STORAGE_KEY);
    if (isSuccess) {
      $.msg(SCRIPT_NAME, '✅ Cookie 捕获成功', '现在可以关闭此脚本规则，或保持原样以便在Cookie失效时自动更新。');
    } else {
      $.msg(SCRIPT_NAME, '⚠️ Cookie 保存失败', '请检查 Loon 权限或存储空间。');
    }
  } else {
    // 可选：如果想在每次访问该网站时都收到通知，可以取消下面的注释
    // $.msg(SCRIPT_NAME, 'ℹ️ 未发现有效Cookie', '请在该网站上执行一次登录操作。');
  }
  
  // 通知 Loon 该请求处理完毕
  $done();
}

/**
 * 功能：执行签到任务
 * 在 cron 环境下运行，读取已保存的 Cookie 并发送签到请求
 */
async function performSignIn() {
  const storedCookie = $.getdata(COOKIE_STORAGE_KEY);

  if (!storedCookie) {
    $.msg(SCRIPT_NAME, '❌ 签到失败', '未能找到有效的 Cookie，请先登录一次以捕获 Cookie。');
    return;
  }

  const requestOptions = {
    url: SIGN_IN_API_URL,
    method: 'POST',
    headers: {
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': `https://${HOSTNAME}/sign_in`,
      'Cookie': storedCookie
    }
  };

  $.log(`🚀 开始请求签到: ${requestOptions.url}`);
  
  // 使用 Promise 封装 $httpClient.post 以便在 async/await 中使用
  return new Promise((resolve) => {
    $httpClient.post(requestOptions, (err, resp, data) => {
      if (err) {
        $.msg(SCRIPT_NAME, '❌ 签到请求失败', `网络错误: ${err}`);
        return resolve();
      }

      try {
        $.log(`📝 收到响应: ${data}`);
        const result = JSON.parse(data);

        if (result.code === 200 || result.message === 'success' || result.message?.includes('签到成功')) {
          $.msg(SCRIPT_NAME, '✅ 签到成功', result.message || '已成功为您签到！');
        } else if (result.code === 401 || result.message?.includes('请先登录')) {
          // Cookie 失效，清除本地保存的无效 Cookie
          $.setdata('', COOKIE_STORAGE_KEY);
          $.msg(SCRIPT_NAME, '⚠️ Cookie 已失效', '请重新登录网站以获取新的 Cookie。');
        } else if (result.message?.includes('已经签到')) {
          $.msg(SCRIPT_NAME, 'ℹ️ 今日已签到', result.message);
        } else {
          $.msg(SCRIPT_NAME, '⚠️ 签到结果异常', `信息: ${result.message || JSON.stringify(result)}`);
        }
      } catch (e) {
        $.msg(SCRIPT_NAME, '❌ 响应解析失败', `无法解析服务器返回的数据: ${data}`);
      } finally {
        resolve();
      }
    });
  });
}


/**************** 迷你 Env ****************/
function Env(name) {
  return new (class {
    constructor(name) {
      this.name = name;
      this.startTime = Date.now();
      this.log(`🔔 ${this.name} 脚本开始执行`);
    }

    log(message) {
      console.log(message);
    }
    
    getdata(key) {
      return $persistentStore.read(key);
    }
    
    setdata(value, key) {
      return $persistentStore.write(value, key);
    }
    
    msg(title, subtitle = '', body = '') {
      $notification.post(title, subtitle, body);
    }
  })(name);
}

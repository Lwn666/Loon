#!name = 探花TV 完整自动签到 (新版)
#!desc = 采用通用请求头捕获 Cookie，不依赖外部 JS 脚本，并每日定时签到。
#!author = @Kimi (由 编码助手 优化)
#!category = 签到

#================================================
#
# 新版使用说明 (2025-07-31 更新):
# 1. 此版本不再依赖外部 JS 脚本来获取 Cookie，而是直接捕获请求头，稳定性更高。
# 2. 首次使用前，请在 App 内退出登录。
# 3. 启用下方的“🍪 Cookie捕获”开关。
# 4. 返回 App 执行登录操作。Loon 会提示已将 Cookie 写入。
# 5. 成功后，务必关闭“🍪 Cookie捕获”开关。
#
#================================================

[Argument]
# --> 开关类参数
# 获取 Cookie 时开启，获取成功后关闭。
捕获Cookie = switch,true,tag=🍪 Cookie捕获,desc=登录成功后，请关闭此开关

# --> 输入类参数
# 定义每日自动签到的时间。
RunTime = input,"0 9 * * *",tag=⏰ 签到时间,desc=默认每天上午 09:00 执行签到

[Script]
# --- Cookie 捕获任务 (通用版) ---
# 当检测到登录请求时，直接从该请求的头部 (Header) 提取 `cookie` 字段的值，
# 并将其保存到持久化变量 `th_cookie` 中。
http-request ^https?://(?:www\.)?navix\.site/api/sign-in, header-capture=th_cookie, key=cookie, enable={捕获Cookie}, tag=探花TV - 获取Cookie, img-url=https://raw.githubusercontent.com/Orz-3/mini/master/Color/tanhua.png

# --- 定时签到任务 ---
# 此任务会读取已保存的 `th_cookie` 值，并用它来执行签到。
# 注意：签到脚本依然需要外部 JS，但获取部分已替换。
cron {RunTime} script-path=https://raw.githubusercontent.com/Lwn666/Loon/refs/heads/main/navix_auto_sign.js, tag=探花TV - 每日签到, timeout=15, img-url=https://raw.githubusercontent.com/Orz-3/mini/master/Color/tanhua.png

[MITM]
hostname = navix.site

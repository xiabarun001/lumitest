# Lumitest 🐱

一只站在桌面上的测试小助手桌宠。测试跑完、出了问题、需要人介入的时候,她会变表情、弹气泡提醒你;平时就在桌面角落待机,偶尔跟你打个招呼。

A desktop pet for QA folks: a chubby kitten that lives on your desktop and reacts to your test results via a tiny local HTTP API.

## 特性

- **透明置顶小窗**,可拖动、记住位置,鼠标平时穿透不挡桌面操作;
- **7 种表情**:待机、开心(通过)、摇头(Fail)、喊你(需介入)、着急、大哭、生气,外加开机挥手和被摸时的陶醉脸;
- **本地通知接口**:任何脚本一行命令就能让她变脸弹气泡,坏消息会一直停留到你点掉;success 到达还会爆彩带🎉;
- **自主活动**:闲了会沿屏幕底边散步(到边折返),小概率 1600px/s 满屏疯跑(撞四边反弹);久不搭理会打瞌睡冒 💤,有动静就醒;
- **拖拽物理**:甩出去带惯性抛飞、重力下落、落地弹跳、撞边反弹;
- **悬停倾身 + 星星特效,双击摸摸**会咕噜咕噜;
- **不定时问候**:每 15~40 分钟随机挥手问好,分早/午/下午/晚/深夜五套话术,可配置喊你的名字;
- **换肤即换图**:往 `assets/` 各状态目录丢 PNG 就行,多张自动轮播,不用改代码;
- 跨平台:macOS / Windows,Electron 实现(已处理 macOS App Nap 定时器降频)。

## 快速开始

需要 Node.js ≥ 20。

```bash
npm install
npm start
```

或者双击 `启动桌宠.command`(Mac)/ `启动桌宠.bat`(Windows),第一次会自动装依赖。

## 让脚本通知她

她在本机 `127.0.0.1:38999` 听一个只对本机开放的接口:

```bash
node notify.mjs success "" "35 条全过"
node notify.mjs fail    "" "40 过 18 挂"
node notify.mjs urgent  "" "生产环境挂了,快来!"
```

或者在 Node 脚本里:

```js
import { petNotify } from './notify.mjs';
await petNotify({ type: 'fail', message: '回归跑完,有 18 条没过' });
```

`type` 七种:`success` `fail` `attention` `urgent` `cry` `angry` `info`。她没在跑时调用会静默返回 false,不影响你的脚本。

其他本地接口(同样只对 127.0.0.1 开放):

```bash
curl -s http://127.0.0.1:38999/health              # 状态:表情/位置/移动模式
curl -s http://127.0.0.1:38999/summon              # 召唤:回主屏右下角挥手
curl -s "http://127.0.0.1:38999/wander?mode=dash"  # 手动散步 walk / 疯跑 dash / 停下 still
```

## 交互

- **拖动**:随便放,位置记在系统用户目录;
- **单击**:点掉气泡 / 收回表情;
- **双击**:摸摸她;
- **悬停**:她朝光标倾身,光标划过掉星星;
- **右键**:「换表情」菜单(7 种直接点选)、「玩一下」菜单(散步/疯跑/放彩带/睡觉/停下/回右下角)、重新加载形象、退出。

## 配置

在本目录建 `.env`(不入库):

```
PET_OWNER=你的名字   # 问候时喊谁,不配就喊「主人」
PET_PORT=38999      # 通知端口,冲突时改
```

## 开机自启动

双击 `安装自启动.command`(Mac)或 `安装自启动.bat`(Windows);对应的卸载脚本一键移除。只写当前用户的自启动配置。

## 换肤

见 [assets/README.md](assets/README.md)。默认皮肤是「妙脆角小猫」;把各状态目录清空就会退回内置的 SVG 小检查员形象。

## 素材声明

默认皮肤取材自网络流传的「妙脆角小猫」表情包(源自小红书博主的猫及网友二创),仅作个人桌宠用途,版权归原作者所有;如有侵权请提 issue,会立即移除。代码部分为 MIT 协议,不覆盖 `assets/` 下的图片素材。

## License

Code: [MIT](LICENSE). Cat images in `assets/`: belong to their original creators, used non-commercially; removed upon request.

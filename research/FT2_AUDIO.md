# 原版音频接入与选材

来源是用户本机 `~/Downloads/ft2逆向/resources/sound/` 提取、并搬入 `assets/ft2-audio/` 的未加密WAV／MP3。现行地图映射从原客户端程序集／配置直接核对，原资源清单用于核实文件；不使用 `supertank-web/` 的规则、地图名称表或音乐映射作为依据；仅用于本项目，未宣称官方授权。

249.19MiB来源素材保持本机原样，并由 `.gitignore` 排除；不进入Git提交、Vite运行时导入或Pages／PWA产物。v2.3.9只提交100个实际使用的压缩MP3，移除误作道具音的Friend采样。v2.3.8恢复九首BGM完整曲目，采用128kbps立体声；总体积与完整时长校验见下方记录，其余30份原件不采用。来源／运行时SHA-256清单 `FT2_AUDIO_SOURCES.json`记录每个文件的前后大小及参数。可在来源目录存在并安装ffmpeg时运行 `python3 scripts/prepare-ft2-audio.py` 重建。

## 本作映射

### v2.3.6 原客户端地图／曲目转换

此前按六图顺序配Stage00000～00005，属于未确证的本作选曲，现已修正。不能把map_name编号直接作为Stage编号，也不能只凭曲名推断地图。

一手依据是提取的 `extracted/assets/Dlls/MyScripts.dll.bytes`（SHA-256 `bda84cf8839f7d22afb68700285b0db21881e6f391c86d2c467c3bf2a3edd8a5`）：

- `MapUtil.init` RVA `0xb27b8` 建立26×4的BgmNumber表，并按 `map_name_{0}` 从Language取地图名；416字节静态表位于FieldRVA `0x24918c`。实际RVA／方法与静态数据哈希见证据JSON，代码位置以该提取客户端为限。
- `MapUtil.setNormalStage` 的21项SoundCount表位于FieldRVA `0x248464`，限制有效曲目数；`getStageBgm(stage, bgm)` 按 `BgmNumber[bgm % SoundCount]` 取数（SoundCount=0时回退1）。因此末尾0不能一概删掉：神圣殿堂的4项实际为10/0/0/0，0也是有效曲目。
- `Share.setStartData` 明确将原服务器 `NStageNumber` 和 `NBgm` 传入 `getStageBgm` 后存为StartStageBgm；SoundManager将Stage音频注册到11000+编号，并按 `stage{0:D5}.mp3` 查文件。这条链路独立于复刻web代码。
- 原 `Language.txt` 的map_name和bgm_name分别提供地图名与曲名；APK清单验证Stage00000～15／17与小写stage00018～22实际存在，16缺失。不把逆向笔记“26张地图BGM”当作编号转换。

| 本作场景 | 原地图号 | 此原客户端有效BGM列表 | 本作使用的原文件／曲名 | 依据与选择边界 |
| --- | --- | --- | --- | --- |
| 青苔峡谷 valley | 无（本作原创） | 无 | Stage00000 · Milyang Fortress | 本作自选，保留现有曲；不赋予原版地图编号 |
| 独木桥 coast | 8 | 9 / 4 / 14 | Stage00004 · Once in a Lifetime | 已确证允许列表，本作选第2项，非唯一原版配乐 |
| 天空之城 moon | 7 | 4 / 8 / 9 | Stage00009 · Be Higher | 已确证允许列表，本作选第3项，非唯一原版配乐 |
| 钢铁工厂 factory | 4 | 5 / 11 / 21 | Stage00005 · The Invincible | 已确证允许列表，本作取首项 |
| 神圣殿堂 temple | 10 | 10 / 0 / 0 / 0 | Stage00010 · Tank Slayer | 已确证允许列表，本作取首项；不能因TeMP Time曲名就选7 |
| 古老埃及 egypt | 9 | 15 / 22 | Stage00015 · Egyptian Rule | 已确证允许列表，本作取首项，与原曲名主题也相符 |

允许列表及调用代码已确证；从多首里固定取一首是本作选曲策略，未实现原服务器NBgm轮换，也不宣称所有历史Fortress 2发行版只有这首配乐。大厅GM01、选坦克GM02、结算GM04以及六图Stage均保留原曲完整时长。BGM为128kbps／44.1kHz立体声；仅加0.12秒淡入／0.35秒淡出以衔接循环，不删除任何时段。此前v2.3.6的前N秒选段已由v2.3.8全曲替换，已核实选曲不变。

`FT2_MAP_BGM_EVIDENCE.json` 保留原程序集／文案／APK清单哈希、两张RVA表、原IL摘要与调用者；用独立Python环境安装dnfile/dncil后运行 `scripts/audit-ft2-bgm.py --client <原提取目录>` 可重核，脚本不读取复刻web项目。`FT2_MAP_BGM_SELECTION.json` 为本作单一选曲配置，压缩脚本读取并校验其是否在原有效列表内；每首原件与压缩文件哈希在 `FT2_AUDIO_SOURCES.json`。

只有当前场景的HTML Audio流播放；设置音乐单独使用媒体元素，底层战斗／地图音乐继续暂停，关闭后按原暂停状态恢复。

按本作13载具顺序（大腕、叉叉、老土、甲壳虫、公爵、雷霆、飞火、流星、小妖、水鬼、闪灵、海怪、暴龙）分配Fire／Bomb组1～13；组内1／2分配普通／特殊武器，是本作的用途分配，不将既有1／2用途分配声明为所有原版武器编号。52种炮火／爆炸采样＋各13种move／Unmove采样全部有实际路由。原目录另有move13／Unmove13，暴龙也能独立使用。

公共14种采样：Push1点击、Select1瞄准／选择、Friend道具／拾取、logo胜利、Turn回合、Wind风／雾／雪、Firewall火线、Homming锁定、BoxLanding箱子落地、heli空投／空袭、Warring超时、Push3转移、quake震地武器、Enemy出局提示。死亡音用途是本作分配，未声明其为确证原版死亡编号；一次性defeat事件使陆地／落水出局均只触发一次，不拖延回合。未实现的陨石等事件不引入闲置素材。特效64kbps单声道，最长4秒，移动最长3秒；统一响度并增加0.7编码前余量，避免短音效MP3过峰，音效文件仍很小；最长完整BGM约4.87MiB，PWA单文件上限调整为8MiB，全部101文件预缓存，总量仍由90MB门禁约束。

## 播放与兼容

随机地图在引擎内先通过记录的seeded RNG解析，runtime config.map始终是实际地图；BGM随实际地图切换。再来一局保留random偏好、换新种子重新抽取。固定地图不新增随机调用，旧种子／出生／天气／AI流程保持。

音效与音乐开关／音量独立并沿用本机设置。用户手势unlock启动／恢复AudioContext及HTML配乐，采样只预解码公共音效与本局载具。采样通过原master／压缩器／立体声定位播放，最多20路，并对同文件75ms内齐射爆炸去重。保留合成蓄力、轻量履带和追踪音；锁定提示合成与Homming叠加，首用未解码时保留合成炮火回退。

暂停会冻结配乐、Web Audio战斗采样时钟和正在播放的HTML提示音；恢复从原位置继续。暂停菜单内的新点击／选择反馈单独用HTML采样播放，不恢复战斗时钟。移动／蓄力／连续锁定循环停止后按游戏状态重建。音效关闭清理所有特效，音乐关闭只停BGM。新局清理旧特效并恢复音频的暂停状态，避免从暂停菜单重新部署后新局无音。

PWA直接对最终dist中的MP3扫描预缓存，移除与globPatterns重复的includeAssets项，每个URL只缓存一次；101个音频的实际离线读取、九场景配乐与92个SFX解码／播放在浏览器专项验证。

## 压缩与质量复核

使用ffmpeg 9.0.2 / libmp3lame，统一44100Hz：BGM为128k／双声道、SFX为64k／单声道，均-vn -map_metadata -1，loudnorm=I=-20:TP=-2:LRA=9；BGM加0.12秒淡入／0.35秒淡出，SFX加volume=0.7。BGM转码命令不传-t／-ss／-to，解码到原件EOF；SFX维持既有最长4秒／移动3秒限制。清单formatVersion=2记录durationMode、sourceSeconds、runtimeSeconds、seconds（音乐为原件容器时长，仅作描述而非截取限制）、实际编码参数、字节与前后SHA-256。

scripts/verify-audio-quality.py检查全部实际采样率／声道下的解码、非零PCM、峰值和循环边界；BGM逐首核对完整原件和运行时44100Hz解码帧数（允许重采样误差小于2ms），再与相同响度／淡化处理的完整原件做16kHz全曲与末5秒对照。浏览器以实际媒体播放验证每段配乐连续两次原生循环，不暂停、不报错；客观指标是对编码／过峰／边缘的检查，不宣称替代主观听感评测。

## 全曲与体积实测

| 场景 | 原件 | 原时长（秒） | 压缩后字节 |
| --- | --- | ---: | ---: |
| bgm-lobby.mp3 | GM01.mp3 | 105.441814 | 1,688,180 |
| bgm-setup.mp3 | GM02.mp3 | 239.931791 | 3,839,834 |
| bgm-result.mp3 | GM04.mp3 | 238.097415 | 3,810,576 |
| bgm-valley.mp3 | Stage00000.mp3 | 207.029116 | 3,313,623 |
| bgm-coast.mp3 | Stage00004.mp3 | 141.688163 | 2,267,889 |
| bgm-moon.mp3 | Stage00009.mp3 | 318.902857 | 5,103,324 |
| bgm-factory.mp3 | Stage00005.mp3 | 295.427483 | 4,727,997 |
| bgm-temple.mp3 | Stage00010.mp3 | 190.775147 | 3,053,652 |
| bgm-egypt.mp3 | Stage00015.mp3 | 119.141587 | 1,907,190 |

九首总时长1856.435373秒；运行时101文件共30,561,813字节（29.15MiB），所选原件84,378,923字节，缩减63.78%。92个SFX运行时哈希与v2.3.7逐个一致。脚本已完整重建，清单同时记录SFX编码限制参数。

完整曲目另由audio-range.js在默认预缓存路由前处理同作用域MP3字节Range，从同一完整缓存Blob切片返回206／Content-Range，支持闭区间、后缀与开放尾段，非法范围416；没有另存曲目副本。解决长曲离线跳转／Safari循环读取整份200响应的问题，实际末段前进后再检验循环。

## v2.3.9 道具与移动声音纠正

运行时本来就全部为MP3，WAV仅在忽略的来源目录，不需要再次转码。按现行ffmpeg脚本完整重建后，100个保留音频的SHA-256与v2.3.8逐一相同；九首BGM保留全长／128kbps立体声，91个音效64kbps单声道。仅移除sfx-item.mp3（Friend.wav，8,820字节），Friend不再用于道具、毒伤或补给拾取；道具点击也不触发通用点击声，改用1.1秒纸色图标浮起动画。拾取箱子使用BoxLanding，正式出局的Enemy提示仍只触发一次。上述旧映射表中的Friend用途已作废。

原客户端一手IL证据存于FT2_SFX_EVIDENCE.json，可用独立Python环境运行scripts/audit-ft2-sfx.py重核。SoundManager.InitSound（RVA 0x9b0b0）将Character×100映射moveN，Character×100+1映射UnmoveN；CCharacter.ChangeAction（RVA 0xa960c）中动作8以循环参数1播放前者，动作9播放后者并停止前者。复核证明moveN作为循环是正确的，本作问题是任何松手都追加了UnmoveN，听起来像移动力耗尽；v2.3.9普通松手／暂停只停循环，只有燃料耗尽才播放UnmoveN。13台载具逐一验证开始／持续／松手／耗尽；素材组与本作载具的既有分配不宣称为所有历史原版版本的编号事实。

来源原件保留本机且不提交，无新增WAV产物。完整长曲、Range离线支持与既有响度／哈希／压缩参数不变；本版正式构建体积及离线核对见QA/v2.3.9-verification.md。

# 13 台原图对照与本作重绘（四槽位版）

2026-11-15。此次覆盖 v2.0.0 仅保证剪影的设定：**机体主色、配色分布与标志结构都按下载的角色图靠拢**。弹体配色与既定武器规则不跟着改。原图只留 research/，游戏用原创 SVG / Canvas 路径；构建没有任何 research 位图。

## 图源与证据范围

- **N**：[韩文《Fortress 2 Blue & Red 登场坦克一览》](https://m.blog.naver.com/twelvecolor/221268500439)。作者明确注明图片来自当时官方 `fortress2.x2game.com`。本次实际下载 pstatic 原尺寸存档：705px 宽的12张命名角色面板，完整保存在 `vehicle-references/original-panels/`。按印在面板上的英文名核对；不是旁边动画的变形机器人图。每台 `id.jpg` 为完整左侧角色区域的裁出图，没有放大后冒称高清。
- **D**：[DailyGame《角色约会：Fortress 超级坦克》，2009-08-26](https://m.dailygame.co.kr/view.php?ud=200908261208260014641_26)。实际浏览正文，下载两幅800×698、768×454配图，保存原档；第一幅是清晰完整 Super Tank 立绘，第二幅显示齐射 / 导弹仓 / 底盘的配色。本次替换了 N 的隐藏款段落里那张「Random 选择框」小图，未拿小随机图冒充暴龙立绘。
- [sources.json](vehicle-references/sources.json) 逐台保存原始图片 URL、文章 URL、面板原文件、裁出位置和尺寸。保留以前 Steam / 日文合照以供版本比较，它们不再承担逐台确证主色的任务。
- **U**：用户明确确认飞火为「红头导弹」；作为主形态依据，并有 N 的红弹头 / 绿底座插画对应。
- 图源是旧官网图片的可读转载与旧新闻，不是当前客户端精确参数表。只有色相与结构参照，不宣称所有版本使用同一逐像素色值；灯、木纹、侧视透视和猪驾驶员仍是本作自绘处理。

| 本作 id / 名字 | 原图文件（vehicle-references/） / 来源 | 原图主色与形态 | 本次自绘的主色与形似要点 |
|---|---|---|---|
| bowl 大腕 / Catapult | bowl.jpg；original-panels/0103.gif；[N](https://m.blog.naver.com/twelvecolor/221268500439) | 金黄木质投石架、蓝灰金属部件、圆轮、长抛杆 | #cda14a 车架，蓝灰配重与木抛杆，投石兜甩臂；保留用户要求的投石车机械结构 |
| crossbow 叉叉 / CrossBow | crossbow.jpg；original-panels/0101.gif；[N](https://m.blog.naver.com/twelvecolor/221268500439) | 金褐木车、绿色弩臂 / 箭头、弓弦与巨大竖弩 | #bd9254 木车，#738349 弩臂，弓弦与箭槽独立，不再草绿整车 |
| cannon 老土 / Cannon | cannon.jpg；original-panels/0102.gif；[N](https://m.blog.naver.com/twelvecolor/221268500439) | 深灰粗短炮筒、木炮架、圆轮、喇叭炮口 | #555d60 铸铁与橡木架、深炮口，仍发射无默认拖尾球弹 |
| beetle 甲壳虫 / Carrot Tank | beetle.jpg；original-panels/0202.gif；[N](https://m.blog.naver.com/twelvecolor/221268500439) | 金橙履带装甲，正面白色条纹、红褐圆顶 | #c5923e 装甲，米白双条与红褐顶盖，低履带；去掉旧砖红整车 |
| duke 公爵 / Duke Tank | duke.jpg；original-panels/0201.gif；[N](https://m.blog.naver.com/twelvecolor/221268500439) | 深绿车体、高弯颈长头、凸眼与大块弯曲白色侧饰 | #55713a 车体、绿色高弯颈／长头、米白凸眼与侧弯管、三轮组；修掉此前只有方舱的近似轮廓 |
| mine 雷霆 / Mine Lander | mine.jpg；original-panels/0203.gif；[N](https://m.blog.naver.com/twelvecolor/221268500439) | 蓝灰圆钝主体、黄绿背箱、灰重履带 | #678994 主体、圆钝装甲、黄绿弹仓和灰履带；去掉原先全方盒堆叠 |
| missile 飞火 / Missile | missile.jpg；original-panels/0301.gif；[N](https://m.blog.naver.com/twelvecolor/221268500439) + 用户确认 | **红头导弹、米白弹带、绿底座**，大前灯 | #71933a 底座、#cb5134 红头锥、米白带与尾翼；依据为用户确认，不再用淡紫双层发射车 |
| multi 流星 / Multi Missile | multi.jpg；original-panels/0302.gif；[N](https://m.blog.naver.com/twelvecolor/221268500439) | 绿灰底架、金黄高发射巢、红橙炮口、宽轮组 | #8b9250 底架、#c2a044 三排发射巢、红橙管口、三轮组；齐射逐管动作 |
| laser 小妖 / Laser Tank | laser.jpg；original-panels/0401.gif；[N](https://m.blog.naver.com/twelvecolor/221268500439) | 红橙上壳、蓝色熨斗形悬浮底、细高发射座与蓝翼 | #c85437 红橙壳、#4c7c92 蓝底盘、窄立座及后翼；去掉旧青绿圆碟主形 |
| water 水鬼 / Poseidon | water.jpg；original-panels/0404.gif；[N](https://m.blog.naver.com/twelvecolor/221268500439) | 鲜绿蛙形浮体、大白凸眼、深蓝底边 | #6e933f 蛙体、米白凸灯、大绿水嘴、#456f81 悬浮底；去掉蓝灰机体 |
| ion 闪灵 / Ion Attacker | ion.jpg；original-panels/0402.gif；[N](https://m.blog.naver.com/twelvecolor/221268500439) | 金橙卵形舱、蓝上盖、黄圈和小白翼 | #cd9d39 舱、#548daa 蓝罩、黄色线圈与小白翼；去掉旧淡紫大蝠翼 |
| sea 海怪 / Secwind | sea.jpg；original-panels/0403.gif；[N](https://m.blog.naver.com/twelvecolor/221268500439) | 金褐头部、蓝色细颈／连杆与紫粉分节足、绿色能量臂和红色端头 | #b68a45 金褐头、蓝色细颈／连杆、#ad82a0 分节足配蓝足端、绿色发射机构与红色侧端头；修掉此前矮圆壳轮廓 |
| dragon 暴龙 / Super Tank | dragon.jpg（800×698）；original-panels/supertank-news-1/2.jpg；[D](https://m.dailygame.co.kr/view.php?ud=200908261208260014641_26) | 蓝底盘、青绿前甲、银灰炮口、粉紫后仓格栅、重履带 | #497d9e 蓝底盘、#5d9e87 前甲／前口鼻、米白眼座、#ba8cad 格栅、银灰发射器；去掉金色翼爪 / 灰色临时轮廓，黄金弹体颜色保持不变 |

13台均有可辨认且有名称对应的单角色参考，不以合照小图或动画角色替代。未确证的细节是本作侧视简化、探照灯和透视布局，已在上表说明，不新增未经核对的原作参数。

## 四位炮手与独立动作

咪猪头：较瘦小、粉脸、红帽蝴蝶结与麦黄色围巾，待机每秒6弧度相位（约0.95Hz）、快步颠簸、双臂跳跃庆祝；大猪头爸爸：宽体圆腹、蓝布帽 / 马甲、浓胡子、稳重眉眼，较慢重心摆动与单臂敬礼。分别使用 paintMimi / paintDad 与各自的姿态计算，没有只换颜色共用同一套猪变换。头像SVG、战场、槽位、血条、小地图、头像预览与胜败同步。两者趴伏身体和脸有交叠连接；中毒咳嗽、冰冻冰沿、海怪半血发怒与30%喘气各有表现。

阿狸 / 小黄鱼妈妈维持本作原创的红狐狸与金鱼身份，不寻找原版坦克图。咪猪头与大猪头爸爸的头像使用用户提供的public/portraits/mimi.png与dad.png；战场立绘与动画沿用本作自绘设计。

## 接手后的逐台复核（2026-11-15）

本会话读取13张已下载的单角色图，分成两张小批次接触表，仅用于查看；没有重新下载或覆盖既有原档。逐台对照图鉴：大腕金黄架／蓝灰部件、叉叉木架／绿弩臂、老土灰炮／木轮、甲壳虫金橙壳／白条、公爵绿色高弯颈／白侧饰、雷霆蓝灰圆体／黄绿箱、飞火红头锥／绿底座、流星金黄发射巢／绿灰底盘、小妖红橙高座／蓝悬浮底、水鬼绿蛙体／白凸眼、闪灵金橙舱／蓝罩／黄圈、海怪金头／蓝细颈／粉分节足、暴龙蓝底盘／绿前甲／紫格栅均可对应。

补齐了上轮公爵仍只剩方舱、海怪仍是矮圆壳、暴龙前甲缺少口鼻和眼座的形似缺口。自绘侧视几何用于图标和战场，炮手继续独立；没有改变任何炮弹配色、弹数、伤害、角度或物理规则。截图证据与最终设置关卡结论见 QA/v2.1-verification.md。

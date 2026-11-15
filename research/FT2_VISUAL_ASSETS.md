# 精选炮弹／特效素材接入（v2.3.5）

来源为用户本机 `ft2逆向/resources/` 的逆向提取 PNG 与 i16 帧元数据，仅本项目使用，未宣称官方授权。`assets/ft2-bullets/` 约 51M 来源原件保留本机并忽略，不进入 GitHub、Pages 或 PWA。

## 单图核对

- `bullet07.png` 的 `bullet07_064`（按元数据独立裁帧，已单张查看）：右侧是分节导弹机身与红头，左侧包含很长的橙色喷焰。喷焰属于原图像素，不能随贴图带入游戏，否则绕过“只有现代系微弱尾迹”的规则。运行时仅取机身内材质纹理并裁掉喷焰，使用当前目录规定的弹体色与自绘外轮廓，不直接替换整个原版帧。
- `explo001.png` 的 `explo001_007`（独立裁帧，已单张查看）：明显的高耸火焰柱与蘑菇烟云，适合大爆破，但直接等尺寸播放会遮挡 HUD／角色。本轮不整张采用这套高柱动画；选更紧凑的爆破／能量／水花序列，降饱和、统一暖色调，仍保留本作原冲击环与碎屑反馈。

## 实际接入

| 运行时文件 | 来源图集 | 处理／用途 |
| --- | --- | --- |
| effects/ft2-blast.png | effect/explos.png | 18帧紧凑爆破，暖黄棕，叠在原冲击环／碎屑下；不改范围或扣血 |
| effects/ft2-energy.png | effect/BLaser.png | 10帧能量冲击，灰青，beam／helix／orbital使用 |
| effects/ft2-water.png | effect/BSWater.png | 9帧水花，灰蓝，水鬼两弹及freeze冲击使用 |
| effects/ft2-flame.png | effect/fire.png | 18帧暖橙小火苗，叠在已有地面火焰内 |
| effects/ft2-gas.png | effect/chemi.png | 6帧灰绿毒气，原圆团和风漂／伤害保持 |
| effects/ft2-missile-grain.png | bullet/bullet07.png | 064～067帧前40%的机身明暗材质，仅裁在飞火普通／特殊内轮廓，目录规定的紫／绿弹体色不变 |
| effects/ft2-multi-grain.png | bullet/bullet08.png | 064～067帧前40%的内纹理，仅裁在流星普通弹内部，蓝弹体色及形状不变 |

全部13载具仍使用本作自绘弹体；老土两弹仍是标准圆球，不混入原帧喷焰。现代系弱线／全系强化星星沿用2.3.4；没有新增强化圈／长尾。未采用其他炮弹整帧、法线图、fitem、contact、天气大图或高柱爆破，避免重复轮廓、冗余体积和规则歧义。

`prepare-ft2-visuals.py` 按解码atlas JSON的指定矩形裁帧，保留逐帧增长的共享尺寸比例；Pillow LANCZOS、灰度暖色化、PNG optimize / compress_level=9。来源包52,878,173字节 → 7运行时图291,620字节（99.45%减少），细节参数／选帧坐标／来源及产物哈希见FT2_VISUAL_SOURCES.json。仅7图进入自动PNG PWA清单，首次一次异步解码且缓存跨局复用；模拟时钟驱动播放，不增加计时器、物理实体或帧随机调用。

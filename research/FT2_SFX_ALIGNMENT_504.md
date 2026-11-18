# 角色音效核查 · 5.0.4

来源：本机 ft2 目录/原版分析，只读取原客户端与本机来源音频，不采用复刻项目规则。仅用于本项目，未宣称官方授权。

SoundManager.InitSound注册角色组：N×100为moveN，+1为UnmoveN，+2／+4为FireN-1／-2，+3／+5为BombN-1／-2。CCharacter.AnimationCallback按Character×100+2／4播放发射；各弹种构造器设置CBullet.Sound，MoveBullet在命中时播放。方法、指令和SHA256见FT2_SFX_EVIDENCE.json，重建脚本为audit-ft2-sfx.py。

共用表src/vehicle-audio-groups.json依据已确认角色号设置：大腕1、叉叉2、老土3、甲壳虫4、公爵5、飞火6、流星7、小妖8、雷霆9、闪灵10、水鬼11、海怪12、暴龙13。

此前按本作载具列表顺序分配，错在6至11组。闪灵和水鬼的普通／特殊发射与爆炸声互换，雷霆／飞火／流星／小妖也错配；36份关联MP3（含移动／停止）全部修正，其它组不变。第14原角色不在本作名单，不把本表推广成它所有声音同号的结论。

SetDeadPlayer依据MyPlayer队伍选择Friend(12)／Enemy(13)。本作补一份实际使用的sfx-death-friendly.mp3，按当前人类仪表盘队伍判断己方／敌方死亡；旧录像没有事件ID时用既有姓名定位，不改变模拟。普通松手只停移动声、耗尽才播UnmoveN，以及道具无声，均保留用户确认的操作选择。

只重建36份错配音效并新增Friend提示，维持64kbps、44.1kHz单声道、loudnorm与0.7余量。全部16首完整BGM和其它音频SHA256不变，完整参数、大小和源／运行时哈希更新于FT2_AUDIO_SOURCES.json。运行时109份MP3均有实际使用路径；原件仍忽略、不提交。

额外空投武器的声音复用与菜单GM选曲仍是本作安排；原声注册事实不等于这些本作选择得到官方授权。

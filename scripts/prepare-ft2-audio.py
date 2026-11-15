"""Create only the runtime FT2 audio selection; keep raw user files local."""
from pathlib import Path
import hashlib, json, subprocess

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets/ft2-audio'
OUTPUT = ROOT / 'public/audio'
VEHICLES = ['bowl', 'crossbow', 'cannon', 'beetle', 'duke', 'mine', 'missile', 'multi', 'laser', 'water', 'ion', 'sea', 'dragon']
BGM = {'lobby': ('GM01.mp3', 45), 'setup': ('GM02.mp3', 45), 'result': ('GM04.mp3', 18),
       'valley': ('Stage00000.mp3', 48), 'coast': ('Stage00001.mp3', 48),
       'moon': ('Stage00002.mp3', 48), 'factory': ('Stage00003.mp3', 48),
       'temple': ('Stage00004.mp3', 48), 'egypt': ('Stage00005.mp3', 48)}
COMMON = {'click': 'Push1.wav', 'select': 'Select1.wav', 'item': 'Friend.wav',
          'win': 'logo.wav', 'turn': 'Turn.wav', 'wind': 'Wind.wav',
          'firewall': 'Firewall.wav', 'lock': 'Homming.wav', 'crate-land': 'BoxLanding.wav',
          'supply': 'heli.wav', 'warning': 'Warring.wav', 'transfer': 'Push3.wav', 'quake': 'quake.wav', 'death': 'Enemy.wav'}

def build():
    OUTPUT.mkdir(exist_ok=True)
    entries = []
    def convert(folder, source, name, limit, music=False):
        # Windows extraction retains inconsistent casing, including Move1 / UnMove5.
        path = next(p for p in (SOURCE / folder).iterdir() if p.name.lower() == source.lower())
        duration = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', str(path)]))
        length = min(duration, limit)
        target = OUTPUT / name
        filters = 'loudnorm=I=-20:TP=-2:LRA=9'
        if music:
            filters += f',afade=t=in:d=0.12,afade=t=out:st={max(0, length-.35)}:d=0.35'
        else:
            # Short WAVs can overshoot after MP3 coding even with loudnorm's target peak.
            filters += ',volume=0.7'
        subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(path),
                        '-t', str(length), '-vn', '-map_metadata', '-1', '-af', filters,
                        '-ac', '2' if music else '1', '-ar', '44100', '-codec:a', 'libmp3lame',
                        '-b:a', '80k' if music else '64k', str(target)], check=True)
        entries.append({'runtime': name, 'source': str(path.relative_to(ROOT)), 'sourceBytes': path.stat().st_size,
                        'sourceSHA256': hashlib.sha256(path.read_bytes()).hexdigest(),
                        'seconds': round(length, 3), 'bytes': target.stat().st_size,
                        'runtimeSHA256': hashlib.sha256(target.read_bytes()).hexdigest()})
    for scene, (source, length) in BGM.items():
        convert('bgm', source, f'bgm-{scene}.mp3', length, True)
    for group, vehicle in enumerate(VEHICLES, 1):
        for variant, weapon in [(1, 'normal'), (2, 'special')]:
            for kind in ['Fire', 'Bomb']:
                convert('sfx', f'{kind}{group}-{variant}.wav', f'sfx-{kind.lower()}-{vehicle}-{weapon}.mp3', 4)
        for kind, prefix in [('move', 'move'), ('stop', 'Unmove')]:
            convert('sfx', f'{prefix}{group}.wav', f'sfx-{kind}-{vehicle}.mp3', 3)
    for name, source in COMMON.items():
        convert('sfx', source, f'sfx-{name}.mp3', 4)
    manifest = {'formatVersion': 1, 'source': '用户本机 ft2逆向/resources/sound 提取素材；仅用于本项目，未宣称官方授权',
                'mapping': '本作按13载具顺序分配音效组；1/2分配普通/特殊音。地图选曲为本作安排，未确证原版同名地图编号。',
                'ffmpegVersion': subprocess.check_output(['ffmpeg', '-version'], text=True).splitlines()[0],
                'settings': {'codec': 'libmp3lame', 'sampleRate': 44100, 'musicChannels': 2, 'effectChannels': 1,
                             'loudnessFilter': 'loudnorm=I=-20:TP=-2:LRA=9', 'musicFadeIn': 0.12, 'musicFadeOut': 0.35,
                             'effectHeadroomGain': 0.7,
                             'effectMaxSeconds': 4, 'moveMaxSeconds': 3, 'stripMetadata': True},
                'sourceOriginalBytes': sum(p.stat().st_size for p in SOURCE.rglob('*') if p.is_file()),
                'selectedOriginalBytes': sum(e['sourceBytes'] for e in entries),
                'musicBitrate': 80000, 'effectBitrate': 64000, 'totalBytes': sum(e['bytes'] for e in entries), 'files': entries}
    (ROOT / 'research/FT2_AUDIO_SOURCES.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print(f"Generated {len(entries)} runtime clips, {manifest['totalBytes']/1024/1024:.2f} MiB")

if __name__ == '__main__':
    build()

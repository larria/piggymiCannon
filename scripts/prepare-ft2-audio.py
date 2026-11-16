"""Create only the runtime FT2 audio selection; keep raw user files local."""
from pathlib import Path
import hashlib, json, subprocess

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets/ft2-audio'
OUTPUT = ROOT / 'public/audio'
VEHICLES = ['bowl', 'crossbow', 'cannon', 'beetle', 'duke', 'mine', 'missile', 'multi', 'laser', 'water', 'ion', 'sea', 'dragon']
SELECTION = json.loads((ROOT / 'research/FT2_MAP_BGM_SELECTION.json').read_text())
EVIDENCE = json.loads((ROOT / 'research/FT2_MAP_BGM_EVIDENCE.json').read_text())
# Validate against original MapUtil / FieldRVA evidence, not web remake rules.
for scene, choice in SELECTION['maps'].items():
    if choice['mapNumber'] is not None:
        stage = next(m for m in EVIDENCE['maps'] if m['mapNumber'] == choice['mapNumber'])
        assert choice['bgmNumber'] in stage['availableBgmNumbers'], (scene, choice)
BGM = {'lobby': 'GM01.mp3', 'setup': 'GM02.mp3', 'result': 'GM04.mp3',
       **{scene: choice['source'] for scene, choice in SELECTION['maps'].items()}}
COMMON = {'click': 'Push1.wav', 'select': 'Select1.wav',
          'win': 'logo.wav', 'turn': 'Turn.wav', 'wind': 'Wind.wav',
          'firewall': 'Firewall.wav', 'lock': 'Homming.wav', 'crate-land': 'BoxLanding.wav',
          'supply': 'heli.wav', 'warning': 'Warring.wav', 'transfer': 'Push3.wav', 'quake': 'quake.wav', 'death': 'Enemy.wav'}

def build():
    OUTPUT.mkdir(exist_ok=True)
    entries = []
    def convert(folder, source, name, limit=None, music=False):
        # Windows extraction retains inconsistent casing, including Move1 / UnMove5.
        path = next(p for p in (SOURCE / folder).iterdir() if p.name.lower() == source.lower())
        duration = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', str(path)]))
        # Music decodes to EOF; only sound effects have time limits.
        length = duration if music else min(duration, limit)
        target = OUTPUT / name
        filters = 'loudnorm=I=-20:TP=-2:LRA=9'
        if music:
            filters += f',afade=t=in:d=0.12,afade=t=out:st={max(0, length-.35)}:d=0.35'
        else:
            # Short WAVs can overshoot after MP3 coding even with loudnorm's target peak.
            filters += ',volume=0.7'
        command = ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(path)]
        if not music:
            command += ['-t', str(length)]
        command += ['-vn', '-map_metadata', '-1', '-af', filters,
                        '-ac', '2' if music else '1', '-ar', '44100', '-codec:a', 'libmp3lame',
                        '-b:a', '128k' if music else '64k', str(target)]
        subprocess.run(command, check=True)
        runtime_duration = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', str(target)]))
        entries.append({'runtime': name, 'source': str(path.relative_to(ROOT)), 'sourceBytes': path.stat().st_size,
                        'sourceSHA256': hashlib.sha256(path.read_bytes()).hexdigest(),
                        'durationMode': 'full' if music else 'bounded-effect',
                        'sourceSeconds': duration, 'seconds': length, 'runtimeSeconds': runtime_duration,
                        'encodingArguments': command[command.index('-i')+2: -1],
                        'bytes': target.stat().st_size,
                        'runtimeSHA256': hashlib.sha256(target.read_bytes()).hexdigest()})
    for scene, source in BGM.items():
        convert('bgm', source, f'bgm-{scene}.mp3', music=True)
        if scene in SELECTION['maps']:
            choice = SELECTION['maps'][scene]
            assert choice['durationMode'] == 'full'
            assert abs(choice['seconds'] - entries[-1]['sourceSeconds']) < .001
    for group, vehicle in enumerate(VEHICLES, 1):
        for variant, weapon in [(1, 'normal'), (2, 'special')]:
            for kind in ['Fire', 'Bomb']:
                convert('sfx', f'{kind}{group}-{variant}.wav', f'sfx-{kind.lower()}-{vehicle}-{weapon}.mp3', 4)
        for kind, prefix in [('move', 'move'), ('stop', 'Unmove')]:
            convert('sfx', f'{prefix}{group}.wav', f'sfx-{kind}-{vehicle}.mp3', 3)
    for name, source in COMMON.items():
        convert('sfx', source, f'sfx-{name}.mp3', 4)
    manifest = {'formatVersion': 2, 'source': '用户本机 ft2逆向/resources/sound 提取素材；仅用于本项目，未宣称官方授权',
                'mapping': '本作13载具分配Fire/Bomb组；1/2分配普通/特殊。经典地图选曲来自原客户端MapUtil有效列表，本作择一；原创峡谷自行选曲，不使用复刻web规则。',
                'mapBgmSelection': SELECTION['maps'],
                'mapBgmEvidence': 'FT2_MAP_BGM_EVIDENCE.json',
                'ffmpegVersion': subprocess.check_output(['ffmpeg', '-version'], text=True).splitlines()[0],
                'settings': {'codec': 'libmp3lame', 'sampleRate': 44100, 'musicChannels': 2, 'effectChannels': 1,
                             'loudnessFilter': 'loudnorm=I=-20:TP=-2:LRA=9', 'musicDurationMode': 'full', 'musicFadeIn': 0.12, 'musicFadeOut': 0.35,
                             'effectHeadroomGain': 0.7,
                             'effectMaxSeconds': 4, 'moveMaxSeconds': 3, 'stripMetadata': True},
                'sourceOriginalBytes': sum(p.stat().st_size for p in SOURCE.rglob('*') if p.is_file()),
                'selectedOriginalBytes': sum(e['sourceBytes'] for e in entries),
                'musicBitrate': 128000, 'effectBitrate': 64000, 'totalBytes': sum(e['bytes'] for e in entries), 'files': entries}
    (ROOT / 'research/FT2_AUDIO_SOURCES.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print(f"Generated {len(entries)} runtime files, {manifest['totalBytes']/1024/1024:.2f} MiB")

if __name__ == '__main__':
    build()

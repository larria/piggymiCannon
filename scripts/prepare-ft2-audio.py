"""Create only the runtime FT2 audio selection; keep raw user files local."""
from pathlib import Path
import hashlib, json, subprocess, argparse

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets/ft2-audio'
OUTPUT = ROOT / 'public/audio'
VEHICLES = ['bowl', 'crossbow', 'cannon', 'beetle', 'duke', 'mine', 'missile', 'multi', 'laser', 'water', 'ion', 'sea', 'dragon']
SFX_GROUPS = json.loads((ROOT / 'src/vehicle-audio-groups.json').read_text())
assert set(SFX_GROUPS) == set(VEHICLES) and set(SFX_GROUPS.values()) == set(range(1,14))
SELECTION = json.loads((ROOT / 'research/FT2_MAP_BGM_SELECTION.json').read_text())
EVIDENCE = json.loads((ROOT / 'research/FT2_MAP_BGM_EVIDENCE.json').read_text())
# Validate against original MapUtil / FieldRVA evidence, not web remake rules.
for scene, choice in SELECTION['maps'].items():
    rule_map = choice.get('musicRuleMapNumber', choice['mapNumber'])
    if rule_map is not None:
        stage = next(m for m in EVIDENCE['maps'] if m['mapNumber'] == rule_map)
        assert set(choice['candidates']).issubset(stage['availableBgmNumbers']), (scene, choice)
BGM = {'lobby': 'GM01.mp3', 'setup': 'GM02.mp3', 'result': 'GM04.mp3',
       **{f'stage-{int(n):05d}': track['source'] for n, track in SELECTION['tracks'].items()}}
COMMON = {'denied': 'Push2.wav', 'click': 'Push1.wav', 'select': 'Select1.wav',
          'win': 'logo.wav', 'turn': 'Turn.wav', 'wind': 'Wind.wav',
          'firewall': 'Firewall.wav', 'lock': 'Homming.wav', 'crate-land': 'BoxLanding.wav',
          'supply': 'heli.wav', 'warning': 'Warring.wav', 'transfer': 'Push3.wav', 'quake': 'quake.wav', 'death': 'Enemy.wav', 'death-friendly': 'Friend.wav'}

def build(only=None):
    OUTPUT.mkdir(exist_ok=True)
    entries = []
    previous = json.loads((ROOT / 'research/FT2_AUDIO_SOURCES.json').read_text()) if only else None
    def convert(folder, source, name, limit=None, music=False):
        if only and name not in only:
            return False
        # Windows extraction retains inconsistent casing, including Move1 / UnMove5.
        path = next(p for p in (SOURCE / folder).iterdir() if p.name.lower() == source.lower())
        duration = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', str(path)]))
        # Music always decodes to EOF; effects keep their established brief cues.
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
        return True
    for scene, source in BGM.items():
        converted = convert('bgm', source, f'bgm-{scene}.mp3', music=True)
        if converted and scene.startswith('stage-'):
            choice = SELECTION['tracks'][str(int(scene[6:]))]
            assert choice['durationMode'] == 'full'
            assert abs(choice['seconds'] - entries[-1]['sourceSeconds']) < .001
    for vehicle in VEHICLES:
        group = SFX_GROUPS[vehicle]
        for variant, weapon in [(1, 'normal'), (2, 'special')]:
            for kind in ['Fire', 'Bomb']:
                convert('sfx', f'{kind}{group}-{variant}.wav', f'sfx-{kind.lower()}-{vehicle}-{weapon}.mp3', 4)
        for kind, prefix in [('move', 'move'), ('stop', 'Unmove')]:
            convert('sfx', f'{prefix}{group}.wav', f'sfx-{kind}-{vehicle}.mp3', 3)
    for name, source in COMMON.items():
        convert('sfx', source, f'sfx-{name}.mp3', 4)
    if only:
        assert entries, 'No requested runtime filename matched'
        merged = {e['runtime']: e for e in previous['files']}
        merged.update({e['runtime']: e for e in entries})
        entries = list(merged.values())
    valid_runtime = {f'bgm-{scene}.mp3' for scene in BGM}
    entries = [e for e in entries if not e['runtime'].startswith('bgm-') or e['runtime'] in valid_runtime]
    for target in OUTPUT.glob('bgm-*.mp3'):
        if target.name not in valid_runtime:
            target.unlink()
    manifest = {'formatVersion': 3, 'source': '本机 ft2 目录/原版分析；来源素材仅用于本项目，未宣称官方授权',
                'mapping': '依据已核实原角色号分配Fire/Bomb/move/Unmove组；1/2分配普通/特殊，非本作载具列表顺序。经典地图选曲来自原客户端MapUtil有效列表，本作择一；原创峡谷自行选曲，不使用复刻web规则。',
                'vehicleAudioGroups': SFX_GROUPS, 'soundEvidence': 'FT2_SFX_EVIDENCE.json',
                'mapBgmSelection': SELECTION['maps'], 'mapBgmTracks': SELECTION['tracks'],
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
    parser = argparse.ArgumentParser()
    parser.add_argument('--only', nargs='+', help='Rebuild only these runtime filenames, preserving the rest')
    build(parser.parse_args().only)

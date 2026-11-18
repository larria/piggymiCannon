"""Decode runtime clips and check peaks / BGM coding error against filtered originals."""
from pathlib import Path
import array, json, math, subprocess, argparse

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(); parser.add_argument('--output', type=Path, default=ROOT / 'QA/audio-quality.json'); parser.add_argument('--only', nargs='+', help='Check only these runtime files'); args = parser.parse_args()
manifest = json.loads((ROOT / 'research/FT2_AUDIO_SOURCES.json').read_text())

def decode(path, filters=None, length=None, rate=16000, channels=1):
    cmd = ['ffmpeg', '-v', 'error', '-i', str(path)]
    if length is not None:
        cmd += ['-t', str(length)]
    if filters:
        cmd += ['-af', filters]
    samples = array.array('f')
    samples.frombytes(subprocess.check_output(cmd + ['-ac', str(channels), '-ar', str(rate), '-f', 'f32le', '-']))
    return samples

def decoded_frame_count(path, channels=2):
    # Stream the unfiltered source to count every decoded sample, including its tail.
    process = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', str(path), '-ac', str(channels),
                                '-ar', '44100', '-f', 's16le', '-'], stdout=subprocess.PIPE)
    size = 0
    while chunk := process.stdout.read(1024*1024):
        size += len(chunk)
    assert process.wait() == 0
    return size // (2*channels)

rows = []
for record in manifest['files']:
    if args.only and record['runtime'] not in args.only:
        continue
    music = record['runtime'].startswith('bgm-')
    channels = 2 if music else 1
    data = decode(ROOT / 'public/audio' / record['runtime'], rate=44100, channels=channels)
    peak = max(abs(v) for v in data)
    rms = math.sqrt(sum(v*v for v in data) / len(data))
    row = {'file': record['runtime'], 'decodedSamples': len(data), 'peak': peak, 'rms': rms,
           'clippedSamples': sum(abs(v) >= 1 for v in data)}
    assert rms > .0001, row
    if not music and record['durationMode']=='full':
        row['sourceDecodedFrames'] = decoded_frame_count(ROOT / record['source'], channels=1)
        row['runtimeDecodedFrames'] = len(data)
        row['durationDifferenceSeconds'] = (row['runtimeDecodedFrames'] - row['sourceDecodedFrames']) / 44100
        assert abs(row['durationDifferenceSeconds']) < .002, row
    if music:
        assert record['durationMode'] == 'full'
        length = record['sourceSeconds']
        source_frames = decoded_frame_count(ROOT / record['source'])
        row['sourceDecodedFrames'] = source_frames
        row['runtimeDecodedFrames'] = len(data) // channels
        row['durationDifferenceSeconds'] = (row['runtimeDecodedFrames'] - source_frames) / 44100
        assert abs(row['durationDifferenceSeconds']) < .002, row
        filters = f'loudnorm=I=-20:TP=-2:LRA=9,afade=t=in:d=0.12,afade=t=out:st={max(0,length-.35)}:d=0.35'
        reference = decode(ROOT / record['source'], filters)
        comparison = decode(ROOT / 'public/audio' / record['runtime'])
        count = min(len(comparison), len(reference))
        signal = sum(v*v for v in reference[:count])
        error = sum((comparison[i]-reference[i])**2 for i in range(count))
        assert abs(len(comparison)-len(reference)) <= 32, row
        row['snrDb'] = 10*math.log10(signal/max(error, 1e-20))
        tail_start = max(0, count-5*16000)
        tail_signal = sum(reference[i]**2 for i in range(tail_start,count))
        tail_error = sum((comparison[i]-reference[i])**2 for i in range(tail_start,count))
        row['tailSnrDb'] = 10*math.log10(tail_signal/max(tail_error,1e-20))
        assert row['tailSnrDb'] > 12, row
        row['loopBoundaryJump'] = max(abs(data[-channels+i]-data[i]) for i in range(channels))
        edge = int(44100*.02)*channels
        row['headRms20ms'] = math.sqrt(sum(v*v for v in data[:edge])/edge)
        row['tailRms20ms'] = math.sqrt(sum(v*v for v in data[-edge:])/edge)
        assert row['snrDb'] > 12 and row['loopBoundaryJump'] < .005, row
    rows.append(row)

result = {'formatVersion': 2, 'decodeSampleRate': 44100, 'comparisonSampleRate': 16000, 'files': rows,
          'allDecodable': True, 'selection': args.only or 'all', 'allSelectedBgmComplete': all('sourceDecodedFrames' in r for r in rows if r['file'].startswith('bgm-')), 'allSelectedEffectsComplete': all('sourceDecodedFrames' in r for r in rows if r['file'].startswith('sfx-')), 'bgmCount': sum(r['file'].startswith('bgm-') for r in rows), 'clippedSamples': sum(r['clippedSamples'] for r in rows),
          'minimumBgmSnrDb': min((r['snrDb'] for r in rows if 'snrDb' in r), default=None),
          'maximumLoopBoundaryJump': max((r['loopBoundaryJump'] for r in rows if 'loopBoundaryJump' in r), default=None),
          'notes': '客观检查不等同于主观听感评测；音乐与完整原件解码样本数及全曲／末5秒对照，未截取；相同响度／极短淡化，检查编码误差、解码、削波和循环边缘。'}
args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k not in ['files','notes']}, ensure_ascii=False))
assert result['clippedSamples'] == 0, 'Decoded overshoot; reduce effect headroom before release.'

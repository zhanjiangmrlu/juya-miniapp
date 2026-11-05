"""在既有生产静态服务发布不可变资源，不接受外部目标目录或命令"""
import base64
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile

BASE = Path('/opt/juya/rebuild/production/miniapp-static')
CONFIG = Path('/etc/nginx/conf.d/juya-rebuild-production.conf')
LOCK = '/run/lock/juya-miniapp-assets.lock'
TYPES = {'.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.gif': 'image/gif', '.woff': 'font/woff'}


def replace_config(data):
    """原子替换生产配置，data 为已经生成的配置字节"""
    with tempfile.NamedTemporaryFile(dir=CONFIG.parent, delete=False) as staged:
        staged.write(data)
        staged.flush()
        os.fsync(staged.fileno())
        name = Path(staged.name)
    try:
        name.chmod(CONFIG.stat().st_mode & 0o777)
        os.replace(name, CONFIG)
    finally:
        if name.exists():
            name.unlink()


def publish():
    """校验stdin资源后创建镜像文件，并原子更新已存在的生产静态配置"""
    payload = sys.stdin.buffer.read(32 * 1024 * 1024 + 1)
    assert len(payload) <= 32 * 1024 * 1024, 'payload too large'
    assets = json.loads(payload)
    checked = []
    assert isinstance(assets, list) and len(assets) <= 1000
    for asset in assets:
        name = asset['file']
        assert re.fullmatch(r'[a-z0-9@._/-]+', name) and not name.startswith('/')
        assert not any(part in {'.', '..'} for part in name.split('/'))
        data = base64.b64decode(asset['data'], validate=True)
        sha = hashlib.sha256(data).hexdigest()
        assert len(data) <= 16 * 1024 * 1024 and sha == asset['sha256']
        assert re.search(r'-' + sha[:12] + r'(?:@3x)?\.[^.]+$', name)
        assert TYPES[Path(name).suffix] == asset['contentType']
        target = BASE / name
        assert target.resolve().is_relative_to(BASE.resolve())
        assert not target.is_symlink() and not BASE.is_symlink()
        assert not any(parent.is_symlink() for parent in target.parents if parent.is_relative_to(BASE))
        if target.exists():
            assert hashlib.sha256(target.read_bytes()).hexdigest() == sha, 'mirror conflict'
        checked.append((name, data, target, asset['contentType']))
    with open(LOCK, 'a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        before = CONFIG.read_bytes()
        backups = BASE.parent / 'asset-publish-backups'
        backups.mkdir(mode=0o700, exist_ok=True)
        backup = backups / (hashlib.sha256(before).hexdigest() + '.conf')
        if not backup.exists():
            backup.write_bytes(before)
            backup.chmod(0o600)
        text = before.decode()
        marker = '    server_name api.juyayingyu.com;'
        assert text.count(marker) == 1
        blocks = []
        for name, data, target, mime in checked:
            target.parent.mkdir(parents=True, exist_ok=True)
            if not target.exists():
                with tempfile.NamedTemporaryFile(dir=BASE.parent, delete=False) as staged:
                    staged.write(data)
                    staged_path = Path(staged.name)
                try:
                    staged_path.chmod(0o644)
                    try:
                        os.link(staged_path, target)
                    except FileExistsError:
                        assert target.read_bytes() == data
                finally:
                    staged_path.unlink()
            location = '/miniapp/static/' + name
            if 'location = ' + location + ' {' not in text:
                blocks.append(f'''
    location = {location} {{
        alias {target};
        default_type {mime};
        access_log off;
        disable_symlinks on;
        add_header Cache-Control "public, max-age=31536000, immutable";
        add_header Access-Control-Allow-Origin "*";
        add_header X-Content-Type-Options nosniff;
        limit_except GET {{ deny all; }}
    }}
''')
        proposed = text.replace(marker, marker + '\n' + ''.join(blocks), 1).encode()
        if blocks:
            assert CONFIG.read_bytes() == before, 'configuration changed concurrently'
            try:
                replace_config(proposed)
                subprocess.run(['nginx', '-t'], check=True, capture_output=True)
                subprocess.run(['systemctl', 'reload', 'nginx'], check=True, capture_output=True)
            except BaseException:
                if CONFIG.read_bytes() == proposed:
                    replace_config(before)
                    subprocess.run(['nginx', '-t'], capture_output=True)
                    subprocess.run(['systemctl', 'reload', 'nginx'], capture_output=True)
                raise
        print(json.dumps({'ok': True, 'files': len(checked), 'new_routes': len(blocks)}))


if __name__ == '__main__':
    publish()

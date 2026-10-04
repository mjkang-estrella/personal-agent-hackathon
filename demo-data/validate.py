#!/usr/bin/env python3
"""Validate email attachments, evidence availability, replay isolation and packaged assets."""
import hashlib
import json
import re
import zipfile
from datetime import datetime
from email import policy
from email.parser import BytesParser
from html.parser import HTMLParser
from pathlib import Path
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parent

def read(path):
    return json.loads(path.read_text())

def normalize(text):
    return ' '.join(text.split())

class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.paths = []
    def handle_starttag(self, tag, attrs):
        self.paths += [v for k, v in attrs if k in ('href', 'src')]

source = read(ROOT / 'source/scenarios.json')
manifest = read(ROOT / 'manifest.json')
assert source['fictional'] and len(source['scenarios']) == len(manifest['scenarios']) == 8
assert all(address.endswith('.example') for _, address in source['people'].values())
all_ids = set()
mail_count = pdf_count = stage_count = 0
for case in source['scenarios']:
    base = ROOT / 'scenarios' / case['id']
    scenario = read(base / 'scenario.json')
    messages = read(base / 'messages.json')
    original = {m['id']: m for m in case['messages']}
    assert scenario['profile']['previousEmployer'] == 'Northstar Studio'
    assert scenario['profile']['nextEmployer'] == 'Orbit Labs'
    assert len(messages) == len(original)
    document_ids = {d['id'] for d in case['documents']}
    assert not all_ids.intersection(set(original) | document_ids)
    all_ids.update(set(original) | document_ids)
    for doc in scenario['documents']:
        path = base / doc['path']
        data = path.read_bytes()
        reader = PdfReader(path)
        assert 0 < len(reader.pages) <= 40
        assert len(data) < 4 * 1024 * 1024
        assert hashlib.sha256(data).hexdigest() == doc['sha256']
        assert not reader.get_fields()
        assert reader.metadata.author == 'JobSwitch Synthetic Demo'
        for page in reader.pages:
            text = page.extract_text()
            assert 'FICTIONAL DEMO DATA' in text and len(text) > 100
            assert not page.get('/Annots')
        pdf_count += 1
    for message in messages:
        parsed = BytesParser(policy=policy.default).parsebytes((base / message['emlPath']).read_bytes())
        assert parsed['Message-ID'] == message['messageId']
        assert parsed['Subject'] == message['subject']
        assert parsed['From'].addresses[0].addr_spec == message['from']['address']
        assert {a.addr_spec for a in parsed['To'].addresses} == {r['address'] for r in message['recipients']}
        assert parsed['X-JobSwitch-Synthetic'] == 'true'
        assert normalize(parsed.get_body(preferencelist=('plain',)).get_content()) == normalize(message['body'])
        parts = list(parsed.iter_attachments())
        assert len(parts) == len(message['attachments'])
        for part, attachment in zip(parts, message['attachments']):
            assert part.get_content_type() == 'application/pdf'
            assert part.get_filename() == Path(attachment['path']).name
            assert part.get_payload(decode=True) == (base / attachment['path']).read_bytes()
        if message['inReplyTo']:
            parent = original[message['inReplyTo']]
            assert datetime.fromisoformat(parent['date']) <= datetime.fromisoformat(message['date'])
            assert parsed['In-Reply-To'] == f"<{parent['id']}@jobswitch.example>"
        mail_count += 1
    visible, available = [], set()
    previous_date = None
    for step in scenario['steps']:
        stage_count += 1
        batch = [m for m in messages if m['stage'] == step['id']]
        assert batch and step['releaseMessageIds'] == [m['id'] for m in batch]
        assert step['requiresUserApproval'] == any(m['direction'] == 'outbound' for m in batch)
        before = available.copy()
        for m in batch:
            date = datetime.fromisoformat(m['date'])
            if previous_date:
                assert date >= previous_date, (case['id'], m['id'], 'nonchronological')
            previous_date = date
            if step['id'] == 'initial':
                assert date <= datetime.fromisoformat(case['initialClock'])
            visible.append(m['id'])
            available.add(m['id'])
            available.update(a['id'] for a in m['attachments'])
        assert set(step['releaseDocumentIds']) == available - before
        bundle = read(base / step['inputBundle'])
        docs = {d['id']: d for d in bundle['documents']}
        assert set(docs) == available
        assert bundle['visibleMessageIds'] == visible
        assert len(docs) <= 20
        assert sum(len(''.join(d['pages'])) for d in docs.values()) <= 250000
        for d in docs.values():
            assert set(d) == {'id', 'name', 'employer', 'kind', 'pages', 'addedAt'}
            assert d['employer'] in {'previous', 'next', 'personal'}
            assert len(''.join(d['pages'])) <= 120000
            assert 0 < len(d['pages']) <= 40
        for evidence in step['evidence']:
            assert evidence['sourceId'] in docs
            assert normalize(evidence['quote']) in normalize(' '.join(docs[evidence['sourceId']]['pages'])), (case['id'], step['id'], evidence)
    assert available == set(original) | document_ids
for path in ROOT.rglob('*.html'):
    parser = Links()
    parser.feed(path.read_text())
    for link in parser.paths:
        assert not re.match(r'https?://', link), (path, link)
        assert (path.parent / link.split('#')[0]).exists(), (path, link)
for path in ROOT.rglob('*'):
    if path.suffix in {'.json', '.txt', '.md', '.html'}:
        assert not re.search('[\uac00-\ud7af]', path.read_text()), ('Non-English text', path)
with zipfile.ZipFile(ROOT / 'jobswitch-demo-data.zip') as archive:
    assert archive.testzip() is None
    expected = {p for p in ROOT.rglob('*') if p.is_file() and p.suffix != '.zip' and '__pycache__' not in p.parts}
    assert len(archive.namelist()) == len(expected)
    for path in expected:
        assert archive.read('demo-data/' + path.relative_to(ROOT).as_posix()) == path.read_bytes()
assert (mail_count, pdf_count) == (42, 16)
print(f'PASS: 8 cases, {mail_count} MIME emails, {pdf_count} PDFs, {stage_count} isolated cumulative stages; evidence, hashes, limits, local links and ZIP verified.')

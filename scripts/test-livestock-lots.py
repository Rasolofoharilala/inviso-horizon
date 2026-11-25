#!/usr/bin/env python3
"""Test HTTP réel : crée deux lots temporaires et tente de les supprimer dans finally."""
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
import getpass
import http.cookiejar
import json
import sys
import urllib.error
import urllib.parse
import urllib.request
import uuid

base = (sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8080').rstrip('/')
assert urllib.parse.urlsplit(base).scheme in ('http', 'https')

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

class Client:
    def __init__(self):
        self.opener = urllib.request.build_opener(NoRedirect(), urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
        self.csrf = None

    def request(self, method, path, body=None, csrf=True):
        headers = {'Accept': 'application/json'}
        if method != 'GET' and csrf:
            if not self.csrf:
                status, self.csrf = self.request('GET', '/api/csrf')
                assert status == 200
            headers[self.csrf['headerName']] = self.csrf['token']
        data = None
        if body is not None:
            data = json.dumps(body).encode()
            headers['Content-Type'] = 'application/json'
        req = urllib.request.Request(base + path, data=data, headers=headers, method=method)
        try:
            with self.opener.open(req, timeout=30) as response:
                raw = response.read()
                return response.status, json.loads(raw) if raw else None
        except urllib.error.HTTPError as response:
            raw = response.read()
            try:
                problem = json.loads(raw)
            except ValueError:
                problem = {'status': response.code}
            return response.code, problem

    def login(self, username, password):
        status, self.csrf = self.request('GET', '/api/csrf')
        assert status == 200
        req = urllib.request.Request(base + '/api/auth/login',
            data=urllib.parse.urlencode({'username': username, 'password': password}).encode(),
            headers={'Content-Type': 'application/x-www-form-urlencoded', self.csrf['headerName']: self.csrf['token']})
        with self.opener.open(req, timeout=30) as response:
            assert response.status == 204
        self.csrf = None

admin = Client()
admin.login('admin', getpass.getpass('Mot de passe admin : '))
viewer = Client()
viewer.login('lecteur', getpass.getpass('Mot de passe lecteur : '))
assert Client().request('GET', '/api/lots')[0] == 401
assert viewer.request('GET', '/api/lots')[0] == 200
assert viewer.request('POST', '/api/lots', {})[0] == 403
assert admin.request('POST', '/api/lots', {}, csrf=False)[0] == 403
today = datetime.now(ZoneInfo('Indian/Antananarivo')).date()
marker = 'TEST-' + uuid.uuid4().hex[:16].upper()
created = {}

def payload(reference, males, females):
    return {'reference': reference, 'name': marker, 'maleCount': males, 'femaleCount': females, 'creationDate': today.isoformat()}

try:
    for suffix, males, females in [('A', 10, 20), ('B', 0, 5)]:
        status, lot = admin.request('POST', '/api/lots', payload(marker + suffix, males, females))
        assert status == 201, lot
        created[lot['id']] = lot
        assert lot['total'] == males + females
        assert lot['ageDays'] == 1 and lot['ageWeek'] == 1
    first = next(iter(created.values()))
    assert admin.request('POST', '/api/lots', payload(marker + 'FUTURE', 1, 1) | {'creationDate': (today + timedelta(days=1)).isoformat()})[0] == 400
    assert admin.request('POST', '/api/lots', payload(marker + 'MISSING', 1, 1) | {'creationDate': None})[0] == 400
    assert admin.request('POST', '/api/lots', payload(first['reference'].lower(), 0, 0))[0] == 409
    assert admin.request('POST', '/api/lots', payload(marker + 'NEG', -1, 0))[0] == 400
    assert admin.request('POST', '/api/lots', payload(marker + 'FRAC', 1.5, 0))[0] == 400
    status, page = admin.request('GET', '/api/lots?' + urllib.parse.urlencode({'q': marker.lower(), 'page': 0, 'size': 1}))
    assert status == 200 and len(page['items']) == 1 and page['totalElements'] == 2
    assert page['totals'] == {'lotCount': 2, 'maleCount': 10, 'femaleCount': 25, 'total': 35}
    path = '/api/lots/' + first['id']
    updated_payload = payload(first['reference'], 15, 20) | {'version': first['version'], 'creationDate': (today - timedelta(days=7)).isoformat()}
    status, updated = admin.request('PUT', path, updated_payload)
    assert status == 200 and updated['total'] == 35, updated
    created[updated['id']] = updated
    assert updated['ageDays'] == 8 and updated['ageWeek'] == 2
    assert admin.request('PUT', path, updated_payload)[0] == 409
    assert admin.request('DELETE', path + '?version=' + str(first['version']))[0] == 409
    assert viewer.request('PUT', path, updated_payload)[0] == 403
    assert viewer.request('DELETE', path + '?version=' + str(updated['version']))[0] == 403
    assert admin.request('GET', '/api/lots?page=-1')[0] == 400
    print('OK : lots, totaux filtrés sur plusieurs pages, validation, concurrence, CSRF et rôles.')
finally:
    for lot in created.values():
        status, _ = admin.request('DELETE', '/api/lots/' + lot['id'] + '?version=' + str(lot['version']))
        if status != 204:
            print('Nettoyage à vérifier pour le lot', lot['reference'], 'HTTP', status)

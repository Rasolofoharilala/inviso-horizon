#!/usr/bin/env python3
"""Contrôles HTTP réels : comptes DEV admin/lecteur/restreint requis (mots de passe saisis)."""
import getpass
import http.cookiejar
import json
import struct
import sys
import urllib.error
import urllib.parse
import urllib.request
import uuid
import zlib

base = (sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8080').rstrip('/')
assert urllib.parse.urlsplit(base).scheme in ('http', 'https')

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

class Client:
    def __init__(self):
        self.opener = urllib.request.build_opener(NoRedirect(), urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
        self.csrf = None

    def request(self, method, path, data=None, content_type=None, csrf=True):
        headers = {}
        if method not in ('GET', 'HEAD') and csrf:
            if self.csrf is None:
                status, payload = self.request('GET', '/api/csrf')
                assert status == 200
                self.csrf = json.loads(payload)
            headers[self.csrf['headerName']] = self.csrf['token']
        if content_type:
            headers['Content-Type'] = content_type
        req = urllib.request.Request(base + path, data=data, headers=headers, method=method)
        try:
            with self.opener.open(req, timeout=30) as res:
                return res.status, res.read()
        except urllib.error.HTTPError as res:
            return res.code, res.read()

    def login(self, username, password):
        result = self.request('POST', '/api/auth/login', urllib.parse.urlencode({'username': username, 'password': password}).encode(), 'application/x-www-form-urlencoded')
        self.csrf = None
        return result[0]

    def upload(self, raw):
        boundary = uuid.uuid4().hex
        body = (f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="photo.png"\r\nContent-Type: image/png\r\n\r\n'.encode()
                + raw + f'\r\n--{boundary}--\r\n'.encode())
        return self.request('POST', '/api/profile/photos', body, 'multipart/form-data; boundary=' + boundary)

def png(red):
    def chunk(kind, body):
        return struct.pack('!I', len(body)) + kind + body + struct.pack('!I', zlib.crc32(kind + body))
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('!2I5B', 1, 1, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(bytes([0, red, 0, 0]))) + chunk(b'IEND', b'')

admin_password = getpass.getpass('Mot de passe DEV admin : ')
viewer_password = getpass.getpass('Mot de passe DEV lecteur : ')
restricted_password = getpass.getpass('Mot de passe DEV restreint : ')
anonymous = Client()
assert anonymous.request('GET', '/api/auth/me')[0] == 401
assert anonymous.login('absent-' + uuid.uuid4().hex, 'password-inexistant') == 401
assert anonymous.login('admin', 'incorrect-' + uuid.uuid4().hex) == 401
assert anonymous.request('GET', '/api/auth/me')[0] == 401
assert anonymous.login('restreint', restricted_password) == 401
assert anonymous.request('GET', '/api/auth/me')[0] == 401
admin, viewer = Client(), Client()
assert admin.login('admin', admin_password) == 204
assert viewer.login('lecteur', viewer_password) == 204
assert viewer.request('POST', '/api/products', b'{}', 'application/json')[0] == 403
assert admin.request('POST', '/api/profile/photos', csrf=False)[0] == 403
assert admin.upload(b'ceci ne contient pas de pixels')[0] == 400
status, before = admin.request('GET', '/api/profile/photos')
assert status == 200
status, result = admin.upload(png(200))
assert status == 201, result
first = json.loads(result)
status, result = admin.upload(png(100))
assert status == 201, result
second = json.loads(result)
assert first['id'] != second['id']
assert admin.request('GET', first['url'])[0] == 200
assert viewer.request('GET', first['url'])[0] == 404
assert viewer.request('PUT', '/api/profile/photos/' + first['id'] + '/current')[0] == 404
status, history = admin.request('GET', '/api/profile/photos')
assert status == 200 and len(json.loads(history)) == len(json.loads(before)) + 2
assert admin.request('PUT', '/api/profile/photos/' + first['id'] + '/current')[0] == 204
assert json.loads(admin.request('GET', '/api/auth/me')[1])['avatarUrl'] == first['url']
assert admin.request('POST', '/api/auth/logout')[0] == 204
assert admin.request('GET', '/api/auth/me')[0] == 401
print('OK : refus de connexion, rôles, CSRF, images, historique, isolation et déconnexion.')
print('Deux photos de test restent dans l’historique du compte DEV admin.')
